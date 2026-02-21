# nyx

Nyx is a platform for open source projects to launch tokens and crowdfund bounties for issue resolution.

Anyone—projects, users, or community members—can add token bounties to issues. Contributors who help resolve issues automatically split the rewards. Tokens are tradable immediately, creating sustainable incentives for open source development.

## Architecture

```
contracts/     Foundry — Solidity 0.8.26, Cancun EVM
dapp/          Next.js 16 — App Router, React 19
indexer/       Envio — real-time event indexing, GraphQL API
```

### Contracts

The `Launchpad` factory contract handles the full lifecycle: deploying a UERC20 token, spinning up a CCA auction, and migrating proceeds into a Uniswap V4 pool via a `FullRangeLBPStrategy`. A companion `LaunchpadLens` provides read-only aggregated views of auction state, bids, pool prices, and strategy status.

Key dependencies: Uniswap V4 (core + periphery), Liquidity Launcher, Continuous Clearing Auction, UERC20 Factory, OpenZeppelin.

We've standardized launch parameters to provide a consistent, fair experience for open source projects and their communities.

### Indexer

Envio-based indexer tracking `TokenLaunched` events and `Transfer` events for all launched tokens. Serves a GraphQL API consumed by the dapp for project discovery, contributor analytics, and community leaderboards.

### Dapp

- **Framework** — Next.js 16, React 19, React Compiler for zero-runtime optimizations
- **Styling** — Tailwind CSS 4, Radix UI primitives, CVA for component variants
- **Web3** — Wagmi hooks, Viem for SIWE and Ethereum interactions, RainbowKit for wallet connection
- **API** — tRPC for type-safe APIs, GraphQL (Envio) for indexed chain data
- **AI Agent** — Vercel AI SDK + Claude for conversational interface
- **Storage** — PostgreSQL with Kysely for type-safe SQL queries, Atlas for schema definitions, IPFS (Pinata) for decentralized storage

The app ships with an AI agent ("Ramen") that can discover projects, participate in launches, execute multi-hop swaps, manage ENS names, and answer questions — all through a conversational interface.

## Design

- **Terminal aesthetic** — monospace fonts, green/purple accents, `$` command prompts, `//` comment annotations. The whole UI feels like a terminal.
- **Single-transaction launches** — token + launch + liquidity deploy in one tx. Perfect for open source projects without deep web3 expertise.
- **Agent-first UX** — complex flows like multi-hop swaps and ENS registration are abstracted behind natural language. The agent handles approvals, routing, and execution.
- **Automatic liquidity** — no manual LP provisioning. Liquidity is created automatically with instant token trading. Contributors and supporters get instant token liquidity.
- **Fair distribution** — everyone gets equal access without being crowded out by whales, VCs, or bots.

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

## Use Cases

### For Open Source Projects
- Launch a project token to create sustainable funding
- Set bounties on critical bugs or features
- Let community crowdfund additional bounties for issues they care about
- Reward multiple contributors automatically when issues are resolved
- No need to rely on unpredictable donations or give up control to VCs

### For Contributors
- Browse projects and find high-value bounties
- Collaborate with others and automatically split rewards
- Earn tradable tokens that appreciate with project success
- Get paid instantly in liquid tokens, not slow fiat payments

### For Users & Community
- Crowdfund bounties for bugs that affect you
- Add rewards to feature requests you want prioritized
- Speed up issue resolution by incentivizing developers
- Become a stakeholder in projects you use
