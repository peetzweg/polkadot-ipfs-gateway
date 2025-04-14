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

// Timeout wrapper for async operations
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

async function isLocallyAvailable(
  helia: Helia,
  cid: CID
): Promise<{ available: boolean; block?: Uint8Array }> {
  try {
    const block = await withTimeout(
      Promise.resolve(helia.blockstore.get(cid)),
      3000,
      "Timeout checking local availability"
    );
    return { available: true, block };
  } catch {
    return { available: false };
  }
}

async function pinIfNew(helia: Helia, cid: CID): Promise<void> {
  try {
    // Check if CID is already pinned
    let isPinned = false;
    try {
      const details = await helia.pins.get(cid);
      if (details) {
        isPinned = true;
      }
    } catch (err) {
      console.warn(`CID '${cid.toString()}' not pinned yet.`);
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
      console.log(
        `[DEBUG] Processing request for CID: ${parsedCid.toString()}, codec: 0x${parsedCid.code.toString(
          16
        )}`
      );

      // Check if CID is available locally first and get the block data if it is
      const localCheck = await isLocallyAvailable(helia, parsedCid);
      console.log(
        `[DEBUG] Local availability check: ${
          localCheck.available ? "available locally" : "not available locally"
        }`
      );

      if (!localCheck.available) {
        console.log(
          "[DEBUG] Attempting to connect to bootnode for content retrieval"
        );
        // Only connect to bootnode if content is not available locally
        try {
          await ensureConnection(helia, PEER_CONFIG.BOOTNODE);
          console.log("[DEBUG] Successfully connected to bootnode");
        } catch (err) {
          console.error("[DEBUG] Failed to connect to bootnode:", err);
          reply.code(503);
          return {
            error: "Gateway is currently unable to connect to the network",
          };
        }
      }

      // Set cache headers based on content source
      if (localCheck.available) {
        // Cache locally available content longer since it's more stable
        reply.header("Cache-Control", "public, max-age=86400"); // 24 hours
      } else {
        // Cache network-retrieved content for less time
        reply.header("Cache-Control", "public, max-age=3600"); // 1 hour
      }

      // Use the block from local check if available, otherwise fetch it
      console.log("[DEBUG] Attempting to get block data");
      const block =
        localCheck.block ??
        (await withTimeout(
          Promise.resolve(helia.blockstore.get(parsedCid)),
          30000,
          "Timeout retrieving content"
        ));
      console.log(
        `[DEBUG] Successfully retrieved block, size: ${block.length} bytes`
      );

      // Only pin if the content was retrieved from the network
      if (!localCheck.available) {
        await pinIfNew(helia, parsedCid);
      }

      // Always return as binary data
      reply.header("Content-Type", "application/octet-stream");
      return block;
    } catch (err: any) {
      console.error("[DEBUG] Error processing request:", err);
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
      const localCheck = await isLocallyAvailable(helia, parsedCid);

      if (!localCheck.available) {
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

      // Set cache headers based on content source
      if (localCheck.available) {
        // Cache locally available content longer since it's more stable
        reply.header("Cache-Control", "public, max-age=86400"); // 24 hours
      } else {
        // Cache network-retrieved content for less time
        reply.header("Cache-Control", "public, max-age=3600"); // 1 hour
      }

      // Create UnixFS instance
      const fs = unixfs(helia);

      // Only pin directory if it was retrieved from the network
      if (!localCheck.available) {
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

      // Always return as binary data
      reply.header("Content-Type", "application/octet-stream");
      return content;
    } catch (err: any) {
      reply.code(404);
      return { error: `File not found: ${err.message}` };
    }
  });

  // Define route to list all pinned CIDs
  fastify.get("/list", async (request, reply) => {
    try {
      const pinnedCids: string[] = [];

      // Iterate through all pinned CIDs
      for await (const pinnedCid of helia.pins.ls()) {
        pinnedCids.push(pinnedCid.toString());
      }

      // Return the list of pinned CIDs
      return {
        pinned_cids: pinnedCids,
        count: pinnedCids.length,
      };
    } catch (err: any) {
      console.error("[DEBUG] Error listing pinned CIDs:", err);
      reply.code(500);
      return { error: `Failed to list pinned CIDs: ${err.message}` };
    }
  });
}
