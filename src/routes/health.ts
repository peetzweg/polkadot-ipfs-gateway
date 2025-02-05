import type { FastifyInstance } from "fastify";
import type { Helia } from "helia";
import { multiaddr } from "@multiformats/multiaddr";
import { PEER_CONFIG, SERVER_CONFIG } from "../../config.js";

export async function registerHealthRoute(
  fastify: FastifyInstance,
  helia: Helia
) {
  fastify.get("/health", async (request, reply) => {
    const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
    const bootnodePeerId = bootnode.getPeerId();
    const connectedPeerIds = Array.from((helia as any).libp2p.getPeers()).map(
      (peer: any) => peer.toString()
    );
    const isConnectedToBootnode = bootnodePeerId
      ? connectedPeerIds.includes(bootnodePeerId)
      : false;

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      node: {
        peerId: (helia as any).libp2p.peerId.toString(),
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

    return health;
  });
}
