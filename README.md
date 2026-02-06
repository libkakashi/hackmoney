# nyx

Nyx is a token launchpad built on Uniswap V4 that uses Continuous Clearing Auctions (CCA) for price discovery. No snipers, no front-running, no MEV.

## Architecture

```
contracts/     Foundry — Solidity 0.8.26, Cancun EVM
dapp/          Next.js 16 — App Router, React 19
indexer/       Envio — real-time event indexing, GraphQL API
```

### Contracts

The `Launchpad` factory contract handles the full lifecycle: deploying a UERC20 token, spinning up a CCA auction, and migrating proceeds into a Uniswap V4 pool via a `FullRangeLBPStrategy`. A companion `LaunchpadLens` provides read-only aggregated views of auction state, bids, pool prices, and strategy status.

Key dependencies: Uniswap V4 (core + periphery), Liquidity Launcher, Continuous Clearing Auction, UERC20 Factory, OpenZeppelin.

We've hardcoded most CCA parameters to abstract out the complexity for more retail focused audience with primary focus on memecoin launches.

### Indexer

Envio-based indexer tracking `TokenLaunched` events and `Transfer` events for all launched tokens. Serves a GraphQL API consumed by the dapp for token discovery, holder analytics, and leaderboards.

### Dapp

- **Framework** — Next.js 16, React 19, React Compiler for zero-runtime optimizations
- **Styling** — Tailwind CSS 4, Radix UI primitives, CVA for component variants
- **Web3** — Wagmi hooks, Viem for SIWE and Ethereum interactions, RainbowKit for wallet connection
- **API** — tRPC for type-safe APIs, GraphQL (Envio) for indexed chain data
- **AI Agent** — Vercel AI SDK + Claude for conversational interface
- **Storage** — PostgreSQL with Kysely for type-safe SQL queries, Atlas for schema definitions, IPFS (Pinata) for decentralized storage

The app ships with an AI agent ("Glitch") that can discover tokens, place bids, execute multi-hop swaps, manage ENS names, and answer questions — all through a conversational interface.

## Design

- **Terminal aesthetic** — monospace fonts, green/purple accents, `$` command prompts, `//` comment annotations. The whole UI feels like a terminal.
- **Single-transaction launches** — salt mining for deterministic CREATE2 addresses means token + auction + strategy deploy in one tx.
- **Agent-first UX** — complex flows like multi-hop swaps and ENS registration are abstracted behind natural language. The agent handles approvals, routing, and execution.
- **Automatic liquidity** — no manual LP provisioning. The strategy contract handles pool creation and full-range position management after auction settlement.

## Development

```bash
# contracts
cd contracts
forge build
forge test

# dapp
cd dapp
cp .env.example .env   # fill in values
bun install
bun dev

# indexer
cd indexer
cp .env.example .env   # fill in values
pnpm install
pnpm dev
```

### Environment variables

**dapp** (`dapp/.env.example`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID |
| `NEXT_PUBLIC_CHAIN_ID` | Target chain ID |
| `NEXT_PUBLIC_RPC_URL` | JSON-RPC endpoint |
| `SESSION_SECRET` | Iron session encryption secret |
| `NEXT_PUBLIC_LAUNCHPAD_ADDR` | Deployed Launchpad contract address |
| `NEXT_PUBLIC_LAUNCHPAD_LENS_ADDR` | Deployed LaunchpadLens contract address |
| `NEXT_PUBLIC_GRAPHQL_URL` | Envio indexer GraphQL endpoint |
| `ANTHROPIC_API_KEY` | Anthropic API key for the AI agent |
| `DATABASE_URL` | PostgreSQL connection string |
| `PINATA_JWT` | Pinata JWT for IPFS uploads |
| `NEXT_PUBLIC_PINATA_GATEWAY` | Pinata gateway URL for serving IPFS content |

**indexer** (`indexer/.env.example`)

| Variable | Description |
|---|---|
| `ENVIO_API_TOKEN` | Envio API token ([create one here](https://envio.dev/app/api-tokens)) |

The dapp, at the moment, is designed to run against a mainnet Anvil fork with a built-in faucet for minting test ETH and USDC.
