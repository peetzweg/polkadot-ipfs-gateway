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
import { determineBestKadProtocol } from "../utils/kadUtils.js";

// Create a Helia node and ensure connection to bootnode
export async function createNode() {
  // Determine the best KAD protocol to use by checking the bootnode
  console.log("Determining best KAD protocol to use...");
  let protocolToUse = DHT_PROTOCOL;

  try {
    protocolToUse = await determineBestKadProtocol(PEER_CONFIG.BOOTNODE);
    console.log(`Using KAD protocol: ${protocolToUse}`);
  } catch (err: any) {
    console.warn(`Failed to determine optimal KAD protocol: ${err.message}`);
    console.log(`Falling back to configured protocol: ${DHT_PROTOCOL}`);
  }

  const libp2p = await createLibp2p({
    transports: [webSockets(), tcp()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify({
        // protocolPrefix: "ipfs",
        maxInboundStreams: 100,
        maxOutboundStreams: 100,
      }),
      dht: kadDHT({
        protocol: protocolToUse,
        clientMode: false,
        maxInboundStreams: 100,
        maxOutboundStreams: 100,
      }),
    },
    addresses: {
      listen: [
        `/ip4/${PEER_CONFIG.P2P_HOST}/tcp/${PEER_CONFIG.P2P_PORT}`,
        `/ip6/::/tcp/${PEER_CONFIG.P2P_PORT}`,
      ],
    },
    connectionManager: {
      maxConnections: Infinity,
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

  // Wait a moment for listeners to be fully established
  setTimeout(() => {
    // Print out all the multiaddresses this node is listening on
    const multiaddrs = helia.libp2p.getMultiaddrs();
    console.log("Node is listening on the following addresses:");
    if (multiaddrs.length === 0) {
      console.log(
        "  No listening addresses found. The node might not be configured to listen."
      );
    } else {
      for (const addr of multiaddrs) {
        console.log(`  ${addr.toString()}`);
      }
    }
  }, 1000);

  // Set up peer connection monitoring
  helia.libp2p.addEventListener("peer:connect", (event) => {
    const peerId = event.detail;
    console.log(`Peer connected: ${peerId.toString()}`);
  });

  helia.libp2p.addEventListener("peer:disconnect", (event) => {
    const peerId = event.detail;
    console.log(`Peer disconnected: ${peerId.toString()}`);
  });

  // Monitor connection events for more details
  helia.libp2p.addEventListener("connection:open", (event) => {
    const connection = event.detail;
    console.log(
      `Connection opened to peer: ${connection.remotePeer.toString()}`
    );
  });

  helia.libp2p.addEventListener("connection:close", (event) => {
    const connection = event.detail;
    console.log(
      `Connection closed to peer: ${connection.remotePeer.toString()}`
    );

    try {
      // Extract and log the reason for disconnection if available
      if (connection.status === "closed") {
        // Log the timeline data
        const timeline = connection.timeline;

        // If we have timeline close data, log it safely
        if (timeline.close) {
          // If there's an error message available, try to extract it
          // Here we use a safe approach to avoid type errors
          try {
            // Try to access the error if it exists
            const closeInfo = timeline.close as any;
            if (
              closeInfo &&
              typeof closeInfo === "object" &&
              closeInfo.error &&
              closeInfo.error.message
            ) {
              console.log(`Disconnection reason: ${closeInfo.error.message}`);
            } else {
              // Otherwise, just log the timestamp
              console.log(
                `Connection closed at: ${new Date(
                  Number(timeline.close)
                ).toISOString()}`
              );
            }
          } catch (err) {
            // Fallback if any error in accessing properties
            console.log(
              `Connection closed at: ${new Date(
                Number(timeline.close)
              ).toISOString()}`
            );
          }
        }
      }
    } catch (err) {
      console.error("Error processing connection close event:", err);
    }
  });

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
