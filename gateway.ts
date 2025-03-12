import { cac } from "cac";
import { createServer, startServer } from "./src/services/server.js";
import { createNode, shutdownNode } from "./src/services/helia.js";
import { loadFixtures } from "./src/services/fixtures.js";
import { registerIpfsRoutes } from "./src/routes/ipfs.js";
import { registerHealthRoute } from "./src/routes/health.js";
import {
  BLOCKSTORE_CONFIG,
  DHT_PROTOCOL,
  PEER_CONFIG,
  SERVER_CONFIG,
} from "./config.js";
import type { FastifyInstance } from "fastify";
import { multiaddr } from "@multiformats/multiaddr";

const cli = cac("gateway");

cli
  .option("-p, --port <port>", "Port to run the gateway on")
  .option("--prefix <prefix>", "Route prefix for all endpoints")
  .option("--bootnode <multiaddr>", "Multiaddr of the bootnode to connect to")
  .help();

const parsed = cli.parse();

// Convert port to number if provided
const portOption = parsed.options.port
  ? Number(parsed.options.port)
  : undefined;

// Normalize prefix if provided
const prefixOption = parsed.options.prefix
  ? `/${String(parsed.options.prefix).replace(/^\/+|\/+$/g, "")}`
  : undefined;

// Validate bootnode if provided
const bootnodeOption = parsed.options.bootnode;
if (bootnodeOption) {
  try {
    multiaddr(bootnodeOption);
  } catch (err: any) {
    console.error("Invalid bootnode multiaddr:", err.message);
    process.exit(1);
  }
}

async function main() {
  try {
    // Override port from command line if provided
    if (portOption) {
      SERVER_CONFIG.PORT = portOption;
    }

    // Override route prefix from command line if provided
    if (prefixOption) {
      SERVER_CONFIG.ROUTE_PREFIX = prefixOption;
    }

    // Override bootnode from command line if provided
    if (bootnodeOption) {
      PEER_CONFIG.BOOTNODE = bootnodeOption;
    }

    // Print configuration summary
    console.log("\nStarting gateway with configuration:");
    console.log("==================================");
    console.log("Server Configuration:");
    console.log(`  Port: ${SERVER_CONFIG.PORT}`);
    if (SERVER_CONFIG.ROUTE_PREFIX) {
      console.log(`  Route Prefix: ${SERVER_CONFIG.ROUTE_PREFIX}`);
    }
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

    // Register routes with prefix if configured
    if (SERVER_CONFIG.ROUTE_PREFIX) {
      console.log(`  Route Prefix: ${SERVER_CONFIG.ROUTE_PREFIX}`);
      await server.register(
        async (instance: FastifyInstance) => {
          await registerHealthRoute(instance, heliaNode);
          await registerIpfsRoutes(instance, heliaNode);
        },
        { prefix: SERVER_CONFIG.ROUTE_PREFIX }
      );
    } else {
      // Register routes without prefix
      await registerHealthRoute(server, heliaNode);
      await registerIpfsRoutes(server, heliaNode);
    }

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
