import cors from "@fastify/cors";
import Fastify from "fastify";
import fastifyCaching from "@fastify/caching";
import { SERVER_CONFIG } from "../../config.js";

export async function createServer() {
  // Create Fastify server
  const fastify = Fastify({
    logger: true,
  });

  // Enable CORS
  await fastify.register(cors, {
    origin: true,
  });

  // Enable caching
  await fastify.register(fastifyCaching, {
    privacy: fastifyCaching.privacy.PUBLIC,
    expiresIn: 3600, // Cache for 1 hour by default
  });

  // If a route prefix is configured, register all routes under this prefix
  if (SERVER_CONFIG.ROUTE_PREFIX) {
    fastify.register(
      async (instance) => {
        // This function will be called with the scoped instance
        // All routes registered on this instance will have the prefix
        return instance;
      },
      { prefix: SERVER_CONFIG.ROUTE_PREFIX }
    );
  }

  return fastify;
}

export async function startServer(fastify: ReturnType<typeof Fastify>) {
  try {
    // Print configuration summary
    console.log("\nStarting gateway with configuration:");
    console.log("==================================");
    console.log("Server Configuration:");
    console.log(`  Host: ${SERVER_CONFIG.HOST}`);
    console.log(`  Port: ${SERVER_CONFIG.PORT}`);
    if (SERVER_CONFIG.ROUTE_PREFIX) {
      console.log(`  Route Prefix: ${SERVER_CONFIG.ROUTE_PREFIX}`);
    }
    console.log("==================================\n");

    await fastify.listen({
      port: SERVER_CONFIG.PORT,
      host: SERVER_CONFIG.HOST,
    });
    console.log(
      `Gateway listening on http://${SERVER_CONFIG.HOST}:${SERVER_CONFIG.PORT}${SERVER_CONFIG.ROUTE_PREFIX}`
    );
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}
