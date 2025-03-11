import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import type { Identify as IdentifyService } from "@libp2p/identify";
import { identify } from "@libp2p/identify";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { multiaddr } from "@multiformats/multiaddr";
import { createLibp2p } from "libp2p";

async function getPeerInfo(targetMultiaddr: string) {
  // Create a minimal libp2p node with just identify service
  const node = await createLibp2p({
    transports: [webSockets(), tcp()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify({
        maxInboundStreams: 100,
        maxOutboundStreams: 100,
      }),
    },
    connectionManager: {
      maxConnections: Infinity,
    },
  });

  try {
    // Start the node
    await node.start();
    console.log("Node started with peer ID:", node.peerId.toString());

    // Connect to the target address
    console.log(`\nConnecting to ${targetMultiaddr}...`);
    const connection = await node.dial(multiaddr(targetMultiaddr));

    // Get identify service
    const identifyService = node.services.identify as IdentifyService;

    // Get peer information using identify protocol
    console.log("\nRequesting peer information...");
    const peerInfo = await identifyService.identify(connection);

    console.log("\n=== Peer Information ===");
    console.log("Protocol Version:", peerInfo.protocolVersion);
    console.log("Agent Version:", peerInfo.agentVersion);
    console.log("\nSupported Protocols:");
    peerInfo.protocols.forEach((protocol, index) => {
      console.log(`${index + 1}. ${protocol}`);
    });

    console.log("\nListen Addresses:");
    peerInfo.listenAddrs.forEach((addr, index) => {
      console.log(`${index + 1}. ${addr.toString()}`);
    });

    // Get observed addresses (how the remote peer sees us)
    if (peerInfo.observedAddr) {
      console.log("\nObserved Address (how the remote peer sees us):");
      console.log(peerInfo.observedAddr.toString());
    }

    // Print connection details
    console.log("\nConnection Details:");
    console.log("Remote Address:", connection.remoteAddr.toString());
    console.log("Direction:", connection.direction);
    console.log("Multiplexer:", connection.multiplexer);
    console.log("Encryption:", connection.encryption);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    // Clean up
    await node.stop();
  }
}

// Check if a multiaddr was provided as a command line argument
const targetMultiaddr = process.argv[2];
if (!targetMultiaddr) {
  console.error("Please provide a multiaddr as a command line argument");
  console.error(
    "Example: ts-node identity.ts /ip4/127.0.0.1/tcp/37999/ws/p2p/12D3KooWQCkBm1BYtkHpocxCwMgR8yjitEeHGx8spzcDLGt2gkBm"
  );
  process.exit(1);
}

// Run the function with the provided multiaddr
getPeerInfo(targetMultiaddr).catch(console.error);
