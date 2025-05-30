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
import path from "path";

// Health check configuration
const HEALTH_CHECK_INTERVAL = 30000; // Check every 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout for health checks
const MAX_CONSECUTIVE_FAILURES = 3; // Number of failures before restart

const cli = cac("gateway");

cli
  .option("-p, --port <port>", "Port to run the gateway on")
  .option("--prefix <prefix>", "Route prefix for all endpoints")
  .option("--bootnode <multiaddr>", "Multiaddr of the bootnode to connect to")
  .option("--p2p-port <port>", "Port for P2P communication")
  .option(
    "--blockstore-folder <folder>",
    "Folder name for the blockstore (default: blocks)"
  )
  .help();

const parsed = cli.parse();

// Convert port to number if provided
const portOption = parsed.options.port
  ? Number(parsed.options.port)
  : undefined;

// Convert P2P port to number if provided
const p2pPortOption = parsed.options.p2pPort
  ? Number(parsed.options.p2pPort)
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

async function checkHealth(server: FastifyInstance): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HEALTH_CHECK_TIMEOUT
    );

    try {
      const response = await fetch(
        `http://${SERVER_CONFIG.HOST}:${SERVER_CONFIG.PORT}${SERVER_CONFIG.ROUTE_PREFIX}/health`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        console.error(`Health check failed with status: ${response.status}`);
        return false;
      }

      const health = await response.json();
      if (health.status !== "healthy") {
        console.error(`Unhealthy status: ${JSON.stringify(health)}`);
        return false;
      }

      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("Health check timed out");
    } else {
      console.error("Health check failed:", err);
    }
    return false;
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

    // Override P2P port from command line if provided
    if (p2pPortOption) {
      PEER_CONFIG.P2P_PORT = p2pPortOption;
    }

    // Override blockstore folder from command line if provided
    if (parsed.options.blockstoreFolder) {
      process.env.BLOCKSTORE_FOLDER = parsed.options.blockstoreFolder;
      // Update the PATH to use the new folder name
      BLOCKSTORE_CONFIG.PATH = path.join(
        process.cwd(),
        parsed.options.blockstoreFolder
      );
      BLOCKSTORE_CONFIG.FOLDER = parsed.options.blockstoreFolder;
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
    console.log(`  P2P Port: ${PEER_CONFIG.P2P_PORT}`);
    console.log("\nDHT Configuration:");
    console.log(`  Protocol: ${DHT_PROTOCOL || "default"}`);
    console.log("\nBlockstore Configuration:");
    console.log(`  Path: ${BLOCKSTORE_CONFIG.PATH}`);
    console.log(`  Folder: ${BLOCKSTORE_CONFIG.FOLDER}`);
    console.log("==================================\n");

    // Initialize Helia node
    const heliaNode = await createNode();
    await heliaNode.start();

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
