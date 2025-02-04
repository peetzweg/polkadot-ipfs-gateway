import Fastify from "fastify";
import cors from "@fastify/cors";
import {
  SERVER_CONFIG,
  PEER_CONFIG,
  DHT_PROTOCOL,
  BLOCKSTORE_CONFIG,
} from "./config.js";
import { heliaService } from "./services/helia.js";
import { fixturesService } from "./services/fixtures.js";
import { healthRoutes } from "./routes/health.js";
import { ipfsRoutes } from "./routes/ipfs.js";

async function startServer() {
  try {
    // Initialize Helia node
    await heliaService.initialize();

    // Load fixtures
    await fixturesService.loadFixtures(heliaService.getNode());

    // Create Fastify server
    const fastify = Fastify({
      logger: true,
    });

    // Enable CORS
    await fastify.register(cors, {
      origin: true,
    });

    // Register routes
    await fastify.register(healthRoutes);
    await fastify.register(ipfsRoutes);

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

    // Start the server
    await fastify.listen({
      port: SERVER_CONFIG.PORT,
      host: SERVER_CONFIG.HOST,
    });

    console.log(
      `Gateway listening on http://${SERVER_CONFIG.HOST}:${SERVER_CONFIG.PORT}`
    );

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log("Shutting down...");
      await heliaService.shutdown();
      await fastify.close();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Start the server
startServer();
