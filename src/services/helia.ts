import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { createHelia } from "helia";
import type { Helia } from "@helia/interface";
import { createLibp2p } from "libp2p";
import { multiaddr } from "@multiformats/multiaddr";
import { FsBlockstore } from "blockstore-fs";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import { PEER_CONFIG, DHT_PROTOCOL, BLOCKSTORE_CONFIG } from "../config.js";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";

export class HeliaService {
  private node: Helia | null = null;

  async initialize(): Promise<Helia> {
    const libp2p = await createLibp2p({
      transports: [webSockets(), tcp()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      services: {
        identify: identify(),
        dht: kadDHT({
          protocol: DHT_PROTOCOL,
          clientMode: true,
        }),
      },
    });

    // Initialize the filesystem blockstore
    const blockstore = new FsBlockstore(BLOCKSTORE_CONFIG.PATH);
    await blockstore.open();

    this.node = await createHelia({
      libp2p,
      blockstore,
      hashers: [blake2b256],
    });

    console.log(
      "Helia node started with peer ID:",
      this.node.libp2p.peerId.toString()
    );

    await this.connectToBootnode();
    return this.node;
  }

  async connectToBootnode() {
    if (!this.node) throw new Error("Helia node not initialized");

    try {
      const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
      console.log("Connecting to bootnode:", bootnode.toString());
      await this.node.libp2p.dial(bootnode);
      console.log("Successfully connected to bootnode!");
    } catch (err: any) {
      console.error("Failed to connect to bootnode:", err.message);
      throw err;
    }
  }

  async ensureBootnodeConnection() {
    if (!this.node) throw new Error("Helia node not initialized");

    const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
    const bootnodePeerId = bootnode.getPeerId();

    if (bootnodePeerId) {
      const peers = Array.from(this.node.libp2p.getPeers());
      const isConnected = peers.some(
        (peer) => peer.toString() === bootnodePeerId
      );

      if (!isConnected) {
        console.log("Bootnode connection lost, reconnecting...");
        try {
          await this.node.libp2p.dial(bootnode);
          await this.node.libp2p.services.dht.getClosestPeers(
            uint8ArrayFromString(bootnodePeerId)
          );
          console.log("Successfully reconnected to bootnode!");
        } catch (err) {
          console.error("Failed to reconnect to bootnode:", err);
          throw err;
        }
      }
    }
  }

  async shutdown() {
    if (!this.node) return;

    if (this.node.blockstore instanceof FsBlockstore) {
      await this.node.blockstore.close();
    }
    await this.node.stop();
    this.node = null;
  }

  getNode(): Helia {
    if (!this.node) throw new Error("Helia node not initialized");
    return this.node;
  }
}

export const heliaService = new HeliaService();
