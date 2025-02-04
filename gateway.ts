import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import cors from "@fastify/cors";
import type { Helia } from "@helia/interface";
import { unixfs } from "@helia/unixfs";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import { multiaddr } from "@multiformats/multiaddr";
import { FsBlockstore } from "blockstore-fs";
import Fastify from "fastify";
import type { Dirent } from "fs";
import { promises as fsPromises } from "fs";
import { createHelia } from "helia";
import { createLibp2p } from "libp2p";
import { CID } from "multiformats/cid";
import path from "path";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { fileURLToPath } from "url";
import {
  BLOCKSTORE_CONFIG,
  DHT_PROTOCOL,
  PEER_CONFIG,
  SERVER_CONFIG,
} from "./config.js";

// Get the directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create Fastify server
const fastify = Fastify({
  logger: true,
});

// Enable CORS
await fastify.register(cors, {
  origin: true,
});

// Function to load and add fixture files to Helia
async function loadFixtures(helia: Helia) {
  const fixturesDir = path.join(__dirname, "..", "fixtures");
  const unixFS = unixfs(helia);

  try {
    const entries = await fsPromises.readdir(fixturesDir, {
      withFileTypes: true,
    });

    console.log("\nLoading fixture files and directories:");
    console.log("==================================");

    // Process files first
    const files = entries.filter((entry: Dirent) => entry.isFile());
    for (const file of files) {
      try {
        const filePath = path.join(fixturesDir, file.name);
        const content = await fsPromises.readFile(filePath);
        const contentBuffer = new TextEncoder().encode(content.toString());
        let codec: number;

        // Determine codec based on file extension
        if (file.name.endsWith(".json")) {
          codec = 0x0200; // json codec
        } else if (file.name.endsWith(".js")) {
          codec = 0x0055; // raw codec
        } else {
          continue; // Skip other file types
        }

        // Create CID with blake2b-256 and appropriate codec
        const hash = await blake2b256.digest(contentBuffer);
        const cid = CID.createV1(codec, hash);

        // Add the content to blockstore
        await helia.blockstore.put(cid, contentBuffer);

        console.log(`  ✓ Added file ${file.name} with CID: ${cid.toString()}`);
      } catch (err: any) {
        console.error(`  ✗ Failed to add file ${file.name}:`, err.message);
      }
    }

    // Process directories using UnixFS
    const directories = entries.filter((entry: Dirent) => entry.isDirectory());
    for (const dir of directories) {
      try {
        const dirPath = path.join(fixturesDir, dir.name);

        // Read directory contents
        const dirContents = await fsPromises.readdir(dirPath);
        const files = await Promise.all(
          dirContents.map(async (fileName) => {
            const filePath = path.join(dirPath, fileName);
            const content = await fsPromises.readFile(filePath);
            return {
              path: path.join(dir.name, fileName),
              content: content,
            };
          })
        );

        // Add directory and its contents to UnixFS
        let lastCID;
        for await (const entry of unixFS.addAll(files)) {
          lastCID = entry.cid;
        }

        if (lastCID) {
          // List all files in the directory
          for await (const file of unixFS.ls(lastCID)) {
            console.log(`    - ${file.name} (${file.cid.toString()})`);
          }

          console.log(
            `  ✓ Added directory ${dir.name} with CID: ${lastCID.toString()}`
          );
        }
      } catch (err: any) {
        console.error(`  ✗ Failed to add directory ${dir.name}:`, err.message);
      }
    }

    console.log("==================================\n");
  } catch (err: any) {
    console.error("Failed to load fixtures:", err.message);
  }
}

// Create a Helia node and ensure connection to bootnode
async function createNode() {
  const libp2p = await createLibp2p({
    transports: [webSockets(), tcp()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      dht: kadDHT({
        protocol: DHT_PROTOCOL,
        clientMode: true,
      }),
    },
  });

  // Initialize the filesystem blockstore
  const blockstore = new FsBlockstore(BLOCKSTORE_CONFIG.PATH);

  // Make sure the blockstore is opened before using it
  await blockstore.open();

  const helia = await createHelia({
    libp2p,
    blockstore,
    hashers: [blake2b256],
  });

  console.log(
    "Helia node started with peer ID:",
    helia.libp2p.peerId.toString()
  );

  // Connect to the bootnode
  try {
    const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
    console.log("Connecting to bootnode:", bootnode.toString());
    await helia.libp2p.dial(bootnode);
    console.log("Successfully connected to bootnode!");
  } catch (err: any) {
    console.error("Failed to connect to bootnode:", err.message);
    // Exit if we can't connect to the bootnode
    process.exit(1);
  }

  // Load and add fixture files
  await loadFixtures(helia);

  return helia;
}

// Initialize Helia node
let heliaNode: Awaited<ReturnType<typeof createNode>>;
try {
  heliaNode = await createNode();
} catch (err) {
  console.error("Failed to create Helia node:", err);
  process.exit(1);
}

// Define health check route
fastify.get("/health", async (request, reply) => {
  const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
  const bootnodePeerId = bootnode.getPeerId();
  const connectedPeerIds = Array.from(heliaNode.libp2p.getPeers()).map((peer) =>
    peer.toString()
  );
  const isConnectedToBootnode = bootnodePeerId
    ? connectedPeerIds.includes(bootnodePeerId)
    : false;

  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    node: {
      peerId: heliaNode.libp2p.peerId.toString(),
      connectedPeers: connectedPeerIds.length,
      bootnode: {
        address: PEER_CONFIG.BOOTNODE,
        connected: isConnectedToBootnode,
      },
    },
    server: {
      host: SERVER_CONFIG.HOST,
      port: SERVER_CONFIG.PORT,
    },
  };

  return health;
});

// Define route to get IPFS blocks
fastify.get("/ipfs/:cid", async (request, reply) => {
  const { cid } = request.params as { cid: string };

  try {
    // Ensure connection to bootnode before proceeding
    const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
    const bootnodePeerId = bootnode.getPeerId();

    if (bootnodePeerId) {
      const peers = Array.from(heliaNode.libp2p.getPeers());
      const isConnected = peers.some(
        (peer) => peer.toString() === bootnodePeerId
      );

      if (!isConnected) {
        console.log("Bootnode connection lost, reconnecting...");
        try {
          await heliaNode.libp2p.dial(bootnode);
          // Add the bootnode to the DHT routing table again
          await heliaNode.libp2p.services.dht.getClosestPeers(
            uint8ArrayFromString(bootnodePeerId)
          );
          console.log("Successfully reconnected to bootnode!");
        } catch (dialErr) {
          console.error("Failed to reconnect to bootnode:", dialErr);
          reply.code(503);
          return {
            error: "Gateway is currently unable to connect to the network",
          };
        }
      }
    }

    // Parse and validate the CID
    const parsedCid = CID.parse(cid);

    // Fetch the block
    const block = await heliaNode.blockstore.get(parsedCid);

    // Check if the codec is dag-json (0x0129) or json (0x0200)
    if (parsedCid.code === 0x0129 || parsedCid.code === 0x0200) {
      try {
        const text = new TextDecoder().decode(block);
        const json = JSON.parse(text);
        reply.header("Content-Type", "application/json");
        return json;
      } catch (parseErr) {
        // If JSON parsing fails, fall back to binary
        reply.header("Content-Type", "application/octet-stream");
        return block;
      }
    }

    // For non-json content, try to decode as UTF-8 text first
    try {
      const text = new TextDecoder().decode(block);
      reply.header("Content-Type", "text/plain");
      return text;
    } catch {
      // If not valid UTF-8, send as binary
      reply.header("Content-Type", "application/octet-stream");
      return block;
    }
  } catch (err: any) {
    reply.code(404);
    return { error: `Block not found: ${err.message}` };
  }
});

// Define route to get a specific file from a UnixFS directory by index
fastify.get<{
  Params: { cid: string; index: string };
}>("/ipfs/:cid/:index", async (request, reply) => {
  const { cid, index } = request.params;
  const idx = parseInt(index, 10);

  try {
    // Ensure connection to bootnode before proceeding
    const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
    const bootnodePeerId = bootnode.getPeerId();

    if (bootnodePeerId) {
      const peers = Array.from(heliaNode.libp2p.getPeers());
      const isConnected = peers.some(
        (peer) => peer.toString() === bootnodePeerId
      );

      if (!isConnected) {
        console.log("Bootnode connection lost, reconnecting...");
        try {
          await heliaNode.libp2p.dial(bootnode);
          await heliaNode.libp2p.services.dht.getClosestPeers(
            uint8ArrayFromString(bootnodePeerId)
          );
          console.log("Successfully reconnected to bootnode!");
        } catch (dialErr) {
          console.error("Failed to reconnect to bootnode:", dialErr);
          reply.code(503);
          return {
            error: "Gateway is currently unable to connect to the network",
          };
        }
      }
    }

    // Parse and validate the CID
    const parsedCid = CID.parse(cid);

    // Create UnixFS instance
    const fs = unixfs(heliaNode);

    // Get directory listing
    const entries = [];
    try {
      for await (const entry of fs.ls(parsedCid)) {
        entries.push(entry);
      }
    } catch (err: any) {
      reply.code(400);
      return { error: "The provided CID is not a UnixFS directory" };
    }

    // Validate index
    if (isNaN(idx) || idx < 0 || idx >= entries.length) {
      reply.code(400);
      return {
        error: "Invalid index",
        total_files: entries.length,
        available_indices: entries.map((e, i) => ({
          index: i,
          name: e.name,
          cid: e.cid.toString(),
        })),
      };
    }

    // Get the entry at the specified index
    const targetEntry = entries[idx];

    // Get the content of the file
    const chunks = [];
    for await (const chunk of fs.cat(targetEntry.cid)) {
      chunks.push(chunk);
    }
    const content = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of chunks) {
      content.set(chunk, offset);
      offset += chunk.length;
    }

    // Try to determine content type
    const fileName = targetEntry.name.toLowerCase();
    if (fileName.endsWith(".json")) {
      reply.header("Content-Type", "application/json");
      try {
        const text = new TextDecoder().decode(content);
        return JSON.parse(text);
      } catch {
        // If JSON parsing fails, return as binary
        reply.header("Content-Type", "application/octet-stream");
        return content;
      }
    } else if (fileName.endsWith(".js")) {
      reply.header("Content-Type", "text/javascript");
      return new TextDecoder().decode(content);
    } else if (fileName.endsWith(".png")) {
      reply.header("Content-Type", "image/png");
      return content;
    } else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
      reply.header("Content-Type", "image/jpeg");
      return content;
    } else {
      // Try to decode as text, fallback to binary
      try {
        const text = new TextDecoder().decode(content);
        reply.header("Content-Type", "text/plain");
        return text;
      } catch {
        reply.header("Content-Type", "application/octet-stream");
        return content;
      }
    }
  } catch (err: any) {
    reply.code(404);
    return { error: `File not found: ${err.message}` };
  }
});

// Start the server
try {
  // Print configuration summary
  console.log("\nStarting gateway with configuration:");
  console.log("==================================");
  console.log("Server Configuration:");
  console.log(`  Host: ${SERVER_CONFIG.HOST}`);
  console.log(`  Port: ${SERVER_CONFIG.PORT}`);
  console.log("\nPeer Configuration:");
  console.log(`  Bootnode: ${PEER_CONFIG.BOOTNODE}`);
  console.log("\nDHT Configuration:");
  console.log(`  Protocol: ${DHT_PROTOCOL || "default"}`);
  console.log("\nBlockstore Configuration:");
  console.log(`  Path: ${BLOCKSTORE_CONFIG.PATH}`);
  console.log("==================================\n");

  await fastify.listen({
    port: SERVER_CONFIG.PORT,
    host: SERVER_CONFIG.HOST,
  });
  console.log(
    `Gateway listening on http://${SERVER_CONFIG.HOST}:${SERVER_CONFIG.PORT}`
  );
} catch (err) {
  console.error("Failed to start server:", err);
  process.exit(1);
}

// Graceful shutdown handler
async function shutdown() {
  console.log("Shutting down...");
  // Close the blockstore before stopping
  if (heliaNode?.blockstore && heliaNode.blockstore instanceof FsBlockstore) {
    await heliaNode.blockstore.close();
  }
  await heliaNode.stop();
  await fastify.close();
  process.exit(0);
}

// Handle graceful shutdown for different signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
