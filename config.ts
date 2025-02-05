import { multiaddr } from "@multiformats/multiaddr";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config();

// Server configuration
export const SERVER_CONFIG = {
  PORT: parseInt(process.env.GATEWAY_PORT || "3000", 10),
  HOST: process.env.GATEWAY_HOST || "localhost", // Use "0.0.0.0" to expose to the web
  ROUTE_PREFIX: process.env.ROUTE_PREFIX
    ? `/${process.env.ROUTE_PREFIX.replace(/^\/+|\/+$/g, "")}`
    : "", // Normalize prefix
};

// Peer configuration
export const PEER_CONFIG = {
  BOOTNODE:
    process.env.BOOTNODE_MULTIADDR ||
    "/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWSYPe8ntNbUhX5BbkD1ZfFkEwoVBeUtSamJZxKiD8yxY8",
};

// Parse and validate the bootnode multiaddr at startup
try {
  multiaddr(PEER_CONFIG.BOOTNODE);
} catch (err: any) {
  console.error("Invalid bootnode multiaddr:", err.message);
  process.exit(1);
}

// DHT protocol configuration
export const DHT_PROTOCOL =
  process.env.DHT_PROTOCOL ||
  "/ddb1e4f77487bc0e05aeb2d3605bd20dfcfd3b6a42cafb718bacbeb0c7a7a60f/kad";

// Blockstore configuration
export const BLOCKSTORE_CONFIG = {
  PATH: process.env.BLOCKSTORE_PATH || path.join(process.cwd(), "blocks"),
};
