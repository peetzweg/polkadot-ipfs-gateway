import { multiaddr } from "@multiformats/multiaddr";
import type { Helia } from "helia";
import type { PeerId } from "@libp2p/interface";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";

let reconnectionPromise: Promise<void> | null = null;
let lastReconnectionAttempt = 0;
const RECONNECTION_COOLDOWN = 5000; // 5 seconds cooldown between reconnection attempts

interface Libp2p {
  peerId: PeerId;
  getPeers(): PeerId[];
  dial(peer: any): Promise<any>;
  services: {
    dht: {
      getClosestPeers(key: Uint8Array): Promise<PeerId[]>;
    };
  };
}

interface HeliaWithLibp2p extends Helia {
  libp2p: Libp2p;
}

export async function ensureConnection(
  helia: Helia,
  bootnodeAddress: string
): Promise<void> {
  const now = Date.now();

  // If there's an ongoing reconnection attempt, wait for it
  if (reconnectionPromise) {
    return reconnectionPromise;
  }

  // If we recently tried to reconnect, don't try again
  if (now - lastReconnectionAttempt < RECONNECTION_COOLDOWN) {
    return;
  }

  const bootnode = multiaddr(bootnodeAddress);
  const bootnodePeerId = bootnode.getPeerId();

  if (!bootnodePeerId) {
    return;
  }

  // Use type assertion to access libp2p
  const libp2p = (helia as any).libp2p;
  const peers = Array.from(libp2p.getPeers());
  const isConnected = peers.some(
    (peer: any) => peer.toString() === bootnodePeerId
  );

  if (!isConnected) {
    console.log("Bootnode connection lost, reconnecting...");

    // Create new reconnection promise
    reconnectionPromise = (async () => {
      lastReconnectionAttempt = now;
      try {
        await libp2p.dial(bootnode);
        // Add the bootnode to the DHT routing table again
        await libp2p.services.dht.getClosestPeers(
          uint8ArrayFromString(bootnodePeerId)
        );
        console.log("Successfully reconnected to bootnode!");
      } catch (err) {
        console.error("Failed to reconnect to bootnode:", err);
        throw err;
      } finally {
        reconnectionPromise = null;
      }
    })();

    return reconnectionPromise;
  }
}
