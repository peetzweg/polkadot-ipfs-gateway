import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { kadDHT } from "@libp2p/kad-dht";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { multiaddr } from "@multiformats/multiaddr";
import { createLibp2p } from "libp2p";
import { DHT_PROTOCOL } from "../../config.js";

/**
 * Detects Kademlia DHT protocols supported by the specified peer(s)
 *
 * @param {string|string[]} targetMultiaddrs - Single multiaddr or array of multiaddrs to check
 * @returns {Promise<{supportedProtocols: string[], matchesOurProtocol: boolean}>} - Information about supported protocols
 */
export async function detectKadProtocols(targetMultiaddrs: string | string[]) {
  // Normalize input to array
  const multiaddrs = Array.isArray(targetMultiaddrs)
    ? targetMultiaddrs
    : [targetMultiaddrs];

  // Create a libp2p node with basic capabilities
  const node = await createLibp2p({
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

  // Collection of results
  const results = {
    supportedProtocols: new Set<string>(),
    matchesOurProtocol: false,
  };

  try {
    // Start the node
    await node.start();
    console.log("Node started with peer ID:", node.peerId.toString());

    // Process each multiaddr
    for (const addr of multiaddrs) {
      try {
        // Connect to the target address
        console.log(`\nConnecting to ${addr}...`);
        const connection = await node.dial(multiaddr(addr));

        // Get peer information using identify protocol
        console.log(`Requesting peer information from ${addr}...`);
        const peerInfo = await node.services.identify.identify(connection);

        // Find all KAD-related protocols
        const kadProtocols = peerInfo.protocols.filter(
          (protocol) =>
            protocol.includes("kad") || protocol.includes(DHT_PROTOCOL)
        );

        if (kadProtocols.length > 0) {
          console.log(`Found KAD protocols on ${addr}:`);
          kadProtocols.forEach((protocol, index) => {
            console.log(`${index + 1}. ${protocol}`);
            results.supportedProtocols.add(protocol);
          });

          // Check if our protocol is supported
          if (kadProtocols.includes(DHT_PROTOCOL)) {
            console.log(
              `Peer ${addr} supports our DHT protocol: ${DHT_PROTOCOL}`
            );
            results.matchesOurProtocol = true;
          }
        } else {
          console.log(`No KAD protocols found on peer ${addr}`);
        }
      } catch (err) {
        console.error(`Error connecting to ${addr}:`, err);
      }
    }
  } finally {
    // Clean up
    await node.stop();
  }

  return {
    supportedProtocols: Array.from(results.supportedProtocols),
    matchesOurProtocol: results.matchesOurProtocol,
  };
}

/**
 * Determines the best KAD protocol to use based on checking available peers
 *
 * @param {string|string[]} targetMultiaddrs - Single multiaddr or array of multiaddrs to check
 * @param {boolean} fallbackToDefault - Whether to fall back to our configured protocol if no match is found
 * @returns {Promise<string>} - The protocol to use
 */
export async function determineBestKadProtocol(
  targetMultiaddrs: string | string[],
  fallbackToDefault = true
): Promise<string> {
  const result = await detectKadProtocols(targetMultiaddrs);

  // If we found that one of the peers supports our protocol, use it
  if (result.matchesOurProtocol) {
    console.log(`Using our configured DHT protocol: ${DHT_PROTOCOL}`);
    return DHT_PROTOCOL;
  }

  // If there are any supported protocols, use the first one
  if (result.supportedProtocols.length > 0) {
    const protocol = result.supportedProtocols[0];
    console.log(`Using peer-supported DHT protocol: ${protocol}`);
    return protocol;
  }

  // Fall back to default protocol if requested
  if (fallbackToDefault) {
    console.log(
      `No compatible protocols found, falling back to our configured protocol: ${DHT_PROTOCOL}`
    );
    return DHT_PROTOCOL;
  }

  // If no fallback and no protocols found, throw an error
  throw new Error(
    "No compatible KAD protocols found and fallback was disabled"
  );
}
