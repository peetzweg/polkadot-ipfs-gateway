# Polkadot IPFS Gateway

A lightweight HTTP gateway that enables access to IPFS content through a Polkadot-specific DHT network. This gateway serves as a bridge between HTTP clients and IPFS content, specifically tailored for the Polkadot ecosystem.

## Prerequisites

- Node.js (latest LTS version recommended)
- pnpm package manager

## Installation

1. Clone the repository
2. Install dependencies:
```bash
pnpm install
```
3. Copy the example environment file and adjust as needed:
```bash
cp .env.example .env
```

## Configuration

Configure the gateway through environment variables:

- `GATEWAY_PORT`: HTTP server port (default: 3000)
- `GATEWAY_HOST`: HTTP server host (default: localhost)
- `BOOTNODE_MULTIADDR`: Multiaddress of the bootnode to connect to
- `DHT_PROTOCOL`: Custom DHT protocol identifier (defaults to Polkadot-specific value)
- `BLOCKSTORE_PATH`: Path where IPFS blocks will be stored (default: ./blocks)

## Usage

Start the gateway:

```bash
pnpm start
```

The gateway provides two main endpoints:

- `/ipfs/:cid` - Retrieve content by CID
- `/health` - Check gateway health and connection status

## License

MIT
