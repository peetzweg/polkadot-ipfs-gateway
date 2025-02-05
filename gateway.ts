import { createServer, startServer } from "./src/services/server.js";
import { createNode, shutdownNode } from "./src/services/helia.js";
import { loadFixtures } from "./src/services/fixtures.js";
import { registerIpfsRoutes } from "./src/routes/ipfs.js";
import { registerHealthRoute } from "./src/routes/health.js";
import { BLOCKSTORE_CONFIG, DHT_PROTOCOL, PEER_CONFIG } from "./config.js";

async function main() {
  try {
    // Print configuration summary
    console.log("\nStarting gateway with configuration:");
    console.log("==================================");
    console.log("Server Configuration:");
    console.log("Peer Configuration:");
    console.log(`  Bootnode: ${PEER_CONFIG.BOOTNODE}`);
    console.log("\nDHT Configuration:");
    console.log(`  Protocol: ${DHT_PROTOCOL || "default"}`);
    console.log("\nBlockstore Configuration:");
    console.log(`  Path: ${BLOCKSTORE_CONFIG.PATH}`);
    console.log("==================================\n");

    // Initialize Helia node
    const heliaNode = await createNode();

    // Load fixtures
    await loadFixtures(heliaNode);

    // Create and configure server
    const server = await createServer();

    // Register routes
    await registerHealthRoute(server, heliaNode);
    await registerIpfsRoutes(server, heliaNode);

    // Start server
    await startServer(server);

    // Graceful shutdown handler
    async function shutdown() {
      console.log("Shutting down...");
      await shutdownNode(heliaNode);
      await server.close();
      process.exit(0);
    }

    // Handle graceful shutdown for different signals
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    console.error("Failed to start gateway:", err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
