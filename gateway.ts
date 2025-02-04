import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { createHelia } from "helia";
import type { Helia } from "@helia/interface";
import { createLibp2p } from "libp2p";
import { multiaddr } from "@multiformats/multiaddr";
import { FsBlockstore } from "blockstore-fs";
import { CID } from "multiformats/cid";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  SERVER_CONFIG,
  PEER_CONFIG,
  DHT_PROTOCOL,
  BLOCKSTORE_CONFIG,
} from "./config.js";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

  try {
    const entries = await fs.readdir(fixturesDir, { withFileTypes: true });

    console.log("\nLoading fixture files and directories:");
    console.log("==================================");

    // Process files first
    const files = entries.filter((entry) => entry.isFile());
    for (const file of files) {
      try {
        const filePath = path.join(fixturesDir, file.name);
        const content = await fs.readFile(filePath);
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

    // Process directories
    const directories = entries.filter((entry) => entry.isDirectory());
    for (const dir of directories) {
      try {
        const dirPath = path.join(fixturesDir, dir.name);

        // Read all files in the directory
        const dirContents = await fs.readdir(dirPath);
        const dirFiles = await Promise.all(
          dirContents.map(async (fileName) => {
            const filePath = path.join(dirPath, fileName);
            const content = await fs.readFile(filePath);
            return {
              name: fileName,
              content: content,
            };
          })
        );

        // Create a buffer containing directory contents
        const dirBuffer = new TextEncoder().encode(
          JSON.stringify({
            name: dir.name,
            files: dirFiles.map((f) => ({
              name: f.name,
              size: f.content.length,
            })),
          })
        );

        // Create CID with blake2b-256 and dag-pb codec
        const hash = await blake2b256.digest(dirBuffer);
        const cid = CID.createV1(0x0070, hash);

        // Add the directory metadata to blockstore
        await helia.blockstore.put(cid, dirBuffer);

        console.log(
          `  ✓ Added directory ${dir.name} with CID: ${cid.toString()}`
        );
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
