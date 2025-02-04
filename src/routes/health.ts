import type { FastifyInstance } from "fastify";
import { multiaddr } from "@multiformats/multiaddr";
import { PEER_CONFIG, SERVER_CONFIG } from "../config.js";
import { heliaService } from "../services/helia.js";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    const node = heliaService.getNode();
    const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
    const bootnodePeerId = bootnode.getPeerId();
    const connectedPeerIds = Array.from(node.libp2p.getPeers()).map((peer) =>
      peer.toString()
    );
    const isConnectedToBootnode = bootnodePeerId
      ? connectedPeerIds.includes(bootnodePeerId)
      : false;

    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      node: {
        peerId: node.libp2p.peerId.toString(),
        connectedPeers: connectedPeerIds.length,
        bootnode: {
          address: PEER_CONFIG.BOOTNODE,
          connected: isConnectedToBootnode,
        },
      },
      server: {
        host: SERVER_CONFIG.HOST,
        port: SERVER_CONFIG.PORT,
      },
    };
  });
}
