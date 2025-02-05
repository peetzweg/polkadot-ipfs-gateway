import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { blake2b256 } from "@multiformats/blake2/blake2b";
import { multiaddr } from "@multiformats/multiaddr";
import { FsBlockstore } from "blockstore-fs";
import { createHelia } from "helia";
import { createLibp2p } from "libp2p";
import { BLOCKSTORE_CONFIG, DHT_PROTOCOL, PEER_CONFIG } from "../../config.js";

// Create a Helia node and ensure connection to bootnode
export async function createNode() {
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

  // Make sure the blockstore is opened before using it
  await blockstore.open();

  const helia = await createHelia({
    libp2p,
    blockstore,
    hashers: [blake2b256],
  });

  console.log(
    "Helia node started with peer ID:",
    helia.libp2p.peerId.toString()
  );

  // Connect to the bootnode
  try {
    const bootnode = multiaddr(PEER_CONFIG.BOOTNODE);
    console.log("Connecting to bootnode:", bootnode.toString());
    await helia.libp2p.dial(bootnode);
    console.log("Successfully connected to bootnode!");
  } catch (err: any) {
    console.error("Failed to connect to bootnode:", err.message);
    // Exit if we can't connect to the bootnode
    process.exit(1);
  }

  return helia;
}

export async function shutdownNode(
  helia: Awaited<ReturnType<typeof createNode>>
) {
  console.log("Shutting down Helia node...");
  // Close the blockstore before stopping
  if (helia?.blockstore && helia.blockstore instanceof FsBlockstore) {
    await helia.blockstore.close();
  }
  await helia.stop();
}
