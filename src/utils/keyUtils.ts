import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";
import type { PrivateKey } from "@libp2p/interface";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { peerIdFromPrivateKey } from "@libp2p/peer-id";

let cachedPrivateKey: PrivateKey | null = null;

export async function getOrCreatePrivateKey(): Promise<PrivateKey> {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  let seed: Uint8Array;
  let privateKey: PrivateKey;

  if (existsSync("./seed.txt")) {
    try {
      const seedHex = readFileSync("./seed.txt", "utf-8");
      seed = new Uint8Array(Buffer.from(seedHex, "hex"));
      console.log("Successfully loaded seed from seed.txt");
      privateKey = await generateKeyPairFromSeed("Ed25519", seed);
    } catch (err) {
      console.error("Failed to restore seed:", err);
      throw err;
    }
  } else {
    // Generate a random 32-byte seed
    seed = crypto.getRandomValues(new Uint8Array(32));
    const seedHex = Buffer.from(seed).toString("hex");
    writeFileSync("./seed.txt", seedHex);
    console.log("Generated and saved new seed to seed.txt");
    privateKey = await generateKeyPairFromSeed("Ed25519", seed);
  }

  cachedPrivateKey = privateKey;
  return privateKey;
}
