import type { FastifyInstance } from "fastify";
import type { Helia } from "helia";
import { unixfs } from "@helia/unixfs";
import type { UnixFS } from "@helia/unixfs";
import { CID } from "multiformats/cid";
import { PEER_CONFIG } from "../../config.js";
import { ensureConnection } from "../utils/peer.js";

type UnixFSEntry = Awaited<ReturnType<UnixFS["ls"]>> extends AsyncIterable<
  infer T
>
  ? T
  : never;

async function isLocallyAvailable(helia: Helia, cid: CID): Promise<boolean> {
  try {
    await helia.blockstore.get(cid);
    return true;
  } catch {
    return false;
  }
}

async function pinIfNew(helia: Helia, cid: CID): Promise<void> {
  try {
    // Check if CID is already pinned
    let isPinned = false;
    for await (const pinnedCid of helia.pins.ls()) {
      if (pinnedCid.toString() === cid.toString()) {
        isPinned = true;
        break;
      }
    }

    // Only pin if not already pinned
    if (!isPinned) {
      for await (const pinnedCid of helia.pins.add(cid)) {
        console.log(`Pinned new CID: ${pinnedCid.toString()}`);
      }
    }
  } catch (pinErr) {
    console.warn(`Failed to pin CID ${cid.toString()}:`, pinErr);
  }
}

export async function registerIpfsRoutes(
  fastify: FastifyInstance,
  helia: Helia
) {
  // Define route to get IPFS blocks
  fastify.get("/ipfs/:cid", async (request, reply) => {
    const { cid } = request.params as { cid: string };

    try {
      // Parse and validate the CID
      const parsedCid = CID.parse(cid);

      // Check if CID is available locally first
      const isLocal = await isLocallyAvailable(helia, parsedCid);

      if (!isLocal) {
        // Only connect to bootnode if content is not available locally
        try {
          await ensureConnection(helia, PEER_CONFIG.BOOTNODE);
        } catch (err) {
          reply.code(503);
          return {
            error: "Gateway is currently unable to connect to the network",
          };
        }
      }

      // Fetch the block
      const block = await helia.blockstore.get(parsedCid);

      // Only pin if the content was retrieved from the network
      if (!isLocal) {
        await pinIfNew(helia, parsedCid);
      }

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
      // Parse and validate the CID
      const parsedCid = CID.parse(cid);

      // Check if directory CID is available locally first
      const isLocal = await isLocallyAvailable(helia, parsedCid);

      if (!isLocal) {
        // Only connect to bootnode if content is not available locally
        try {
          await ensureConnection(helia, PEER_CONFIG.BOOTNODE);
        } catch (err) {
          reply.code(503);
          return {
            error: "Gateway is currently unable to connect to the network",
          };
        }
      }

      // Create UnixFS instance
      const fs = unixfs(helia);

      // Only pin directory if it was retrieved from the network
      if (!isLocal) {
        await pinIfNew(helia, parsedCid);
      }

      // Get directory listing
      const entries: UnixFSEntry[] = [];
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

      // Pin the file CID to persist it locally
      try {
        // Use the built-in pinning system
        for await (const pinnedCid of helia.pins.add(targetEntry.cid)) {
          console.log(
            `Pinned file CID: ${pinnedCid.toString()} (${targetEntry.name})`
          );
        }
      } catch (pinErr) {
        console.warn(
          `Failed to pin file CID ${targetEntry.cid.toString()}:`,
          pinErr
        );
        // Continue even if pinning fails - we still want to return the content
      }

      // Get the content of the file
      const chunks: Uint8Array[] = [];
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
}
