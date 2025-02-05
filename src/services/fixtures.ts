import type { Helia } from "helia";
import { unixfs } from "@helia/unixfs";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import { CID } from "multiformats/cid";
import { promises as fsPromises } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to load and add fixture files to Helia
export async function loadFixtures(helia: Helia) {
  const fixturesDir = path.join(__dirname, "..", "..", "..", "fixtures");
  const unixFS = unixfs(helia);

  try {
    const entries = await fsPromises.readdir(fixturesDir, {
      withFileTypes: true,
    });

    console.log("\nLoading fixture files and directories:");
    console.log("==================================");

    // Process files first
    const files = entries.filter((entry) => entry.isFile());
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
    const directories = entries.filter((entry) => entry.isDirectory());
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
