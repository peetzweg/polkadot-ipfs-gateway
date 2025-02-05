import cors from "@fastify/cors";
import Fastify from "fastify";
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
    console.log("==================================\n");

    await fastify.listen({
      port: SERVER_CONFIG.PORT,
      host: SERVER_CONFIG.HOST,
    });
    console.log(
      `Gateway listening on http://${SERVER_CONFIG.HOST}:${SERVER_CONFIG.PORT}`
    );
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}
