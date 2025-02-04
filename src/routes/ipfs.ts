import type { FastifyInstance } from "fastify";
import { CID } from "multiformats/cid";
import { unixfs } from "@helia/unixfs";
import { heliaService } from "../services/helia.js";
import { setContentTypeAndFormat } from "../utils/content.js";

export async function ipfsRoutes(fastify: FastifyInstance) {
  // Get block by CID
  fastify.get("/ipfs/:cid", async (request, reply) => {
    const { cid } = request.params as { cid: string };

    try {
      await heliaService.ensureBootnodeConnection();

      // Parse and validate the CID
      const parsedCid = CID.parse(cid);

      // Fetch the block
      const block = await heliaService.getNode().blockstore.get(parsedCid);

      // Check if the codec is json (0x0200)
      if (parsedCid.code === 0x0200) {
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

  // Get file from UnixFS directory by index
  fastify.get<{
    Params: { cid: string; index: string };
  }>("/ipfs/:cid/:index", async (request, reply) => {
    const { cid, index } = request.params;
    const idx = parseInt(index, 10);

    try {
      await heliaService.ensureBootnodeConnection();

      // Parse and validate the CID
      const parsedCid = CID.parse(cid);

      // Create UnixFS instance
      const fs = unixfs(heliaService.getNode());

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

      return setContentTypeAndFormat(targetEntry.name, content, reply);
    } catch (err: any) {
      reply.code(404);
      return { error: `File not found: ${err.message}` };
    }
  });
}
