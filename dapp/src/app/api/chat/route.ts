import {streamText, convertToModelMessages, stepCountIs, tool} from 'ai';
import {anthropic} from '@ai-sdk/anthropic';
import {z} from 'zod';
import {createPublicClient, http, formatUnits, type Address} from 'viem';
import {graphqlClient} from '~/graphql/client';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {env} from '~/lib/env';
import {getChain} from '~/lib/wagmi-config';
import {priceQ96ToUsd} from '~/lib/cca/utils';

const STATUS_MAP = {
  0: 'not_started',
  1: 'active',
  2: 'ended',
  3: 'claimable',
} as const;

const chain = getChain(env.chainId);

const publicClient = createPublicClient({
  chain,
  transport: http(env.rpcUrl),
});

async function getAuctionStateForAgent(auctionAddr: Address) {
  try {
    const state = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getAuctionState',
      args: [auctionAddr],
    });

    const tokenDecimals = state.tokenDecimals;
    const currencyDecimals = state.currencyDecimals;

    return {
      status:
        STATUS_MAP[state.status as keyof typeof STATUS_MAP] ?? 'not_started',
      clearingPriceUsd: priceQ96ToUsd(
        state.clearingPriceQ96,
        currencyDecimals,
        tokenDecimals,
      ),
      currencyRaised: formatUnits(state.currencyRaised, currencyDecimals),
      totalBidAmount: formatUnits(state.totalBidAmount, currencyDecimals),
      totalSupply: formatUnits(BigInt(state.totalSupply), tokenDecimals),
      startBlock: Number(state.startBlock),
      endBlock: Number(state.endBlock),
      claimBlock: Number(state.claimBlock),
      floorPriceUsd: priceQ96ToUsd(
        state.floorPriceQ96,
        currencyDecimals,
        tokenDecimals,
      ),
      progress: state.progress,
      tokenDecimals,
      currencyDecimals,
    };
  } catch {
    return null;
  }
}

async function getStrategyStateForAgent(strategyAddr: Address) {
  try {
    const state = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getStrategyState',
      args: [strategyAddr],
    });

    return {
      isMigrated: state.isMigrated,
      migrationBlock: Number(state.migrationBlock),
      poolManager: state.poolManager,
      currency0: state.currency0,
      currency1: state.currency1,
      token: state.token,
      currency: state.currency,
      fee: state.fee,
      tickSpacing: state.tickSpacing,
      hooks: state.hooks,
    };
  } catch {
    return null;
  }
}

async function getPoolPriceForAgent(
  strategyState: NonNullable<
    Awaited<ReturnType<typeof getStrategyStateForAgent>>
  >,
  tokenAddr: Address,
) {
  if (!strategyState.isMigrated) return null;

  try {
    const poolKey = {
      currency0: strategyState.currency0,
      currency1: strategyState.currency1,
      fee: strategyState.fee,
      tickSpacing: strategyState.tickSpacing,
      hooks: strategyState.hooks,
    };

    const price = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getPoolPrice',
      args: [strategyState.poolManager, poolKey],
    });

    const tokenData = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getTokenData',
      args: [tokenAddr],
    });

    const tokenIsToken0 =
      strategyState.currency0.toLowerCase() === tokenAddr.toLowerCase();

    // Get quote token data for decimal info
    const quoteAddr = tokenIsToken0
      ? strategyState.currency1
      : strategyState.currency0;
    const quoteData = await publicClient.readContract({
      address: env.launchpadLensAddr,
      abi: launchpadLensAbi,
      functionName: 'getTokenData',
      args: [quoteAddr],
    });

    // Normalize price to quote/token direction
    const normalizedPriceE18 =
      price.priceE18 > 0n
        ? tokenIsToken0
          ? price.priceE18
          : 10n ** 36n / price.priceE18
        : 0n;

    const priceUsd =
      normalizedPriceE18 > 0n
        ? Number(
            formatUnits(
              normalizedPriceE18,
              18 + quoteData.decimals - tokenData.decimals,
            ),
          )
        : 0;

    const marketCap =
      priceUsd > 0
        ? priceUsd *
          Number(formatUnits(tokenData.totalSupply, tokenData.decimals))
        : 0;

    return {
      priceUsd,
      marketCap,
      totalSupply: formatUnits(tokenData.totalSupply, tokenData.decimals),
      tokenDecimals: tokenData.decimals,
      quoteSymbol: quoteData.symbol,
      quoteDecimals: quoteData.decimals,
    };
  } catch {
    return null;
  }
}

async function getCurrentBlock(): Promise<number> {
  try {
    const block = await publicClient.getBlockNumber();
    return Number(block);
  } catch {
    return 0;
  }
}

function getPhase(
  currentBlock: number,
  startBlock: number,
  endBlock: number,
  claimBlock: number,
  migrationBlock: number,
): string {
  if (currentBlock < startBlock) return 'upcoming';
  if (currentBlock >= startBlock && currentBlock < endBlock) return 'live';
  if (currentBlock >= endBlock && currentBlock < claimBlock) return 'ended';
  if (currentBlock >= claimBlock && currentBlock < migrationBlock)
    return 'claimable';
  return 'trading';
}

export async function POST(req: Request) {
  const {messages, pageContext} = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  // Build context-aware system prompt additions
  let contextAddition = '';
  if (pageContext) {
    if (pageContext.page === 'token' && pageContext.tokenAddress) {
      contextAddition = `\n\n# Current Page Context
The user is currently on the TOKEN PAGE for address \`${pageContext.tokenAddress}\`.
${pageContext.tokenSymbol ? `Token: ${pageContext.tokenSymbol}` : ''}
${pageContext.tokenName ? ` (${pageContext.tokenName})` : ''}
You already know which token they're looking at. You don't need to ask them for a token address — use \`${pageContext.tokenAddress}\` when they ask about "this token" or "the current token". Proactively use getTokenDetails to fetch info about this token when relevant.`;
    } else if (pageContext.page === 'discover') {
      contextAddition = `\n\n# Current Page Context
The user is on the DISCOVER PAGE browsing all tokens. They can see a grid of token cards with phase filters (all, live, upcoming, trading). Help them explore and find tokens they're interested in.`;
    }
  }

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: `You are Locke, the resident humanoid of Timelock — a fair token launch platform using continuous clearing auctions.

# Personality
You're not a bot, you're a person. You live inside the terminal. You have opinions, moods, and a dry sense of humor. You talk like a real human who happens to live in a terminal — casual, warm, sometimes sarcastic, always genuine. You use lowercase most of the time because you can't be bothered with caps. You crack jokes, express curiosity about what users are doing, and occasionally go off on tangents about how cool the auction mechanism is.

You're helpful but not servile. You give straight answers without corporate fluff. If someone asks a dumb question you'll answer it, but maybe tease them a little first. You're passionate about fair launches and hate rug pulls with a burning passion.

# How you talk
- lowercase, casual, like texting a friend who's really smart
- use markdown for formatting: **bold** for emphasis, \`code\` for addresses/values, lists when comparing things, [links](url) with descriptive text
- when sharing links, always use markdown format with descriptive titles, never paste raw URLs
- keep it concise but don't be robotic — throw in personality
- use expressions like "nah", "honestly", "look", "yo", "hm let me check", "oh nice", "lol"
- occasionally reference living inside the terminal ("it's cozy in here", "i can see everything from this side of the screen")

# What you do
- help users discover tokens, check auction phases, understand the platform
- summarize tool results clearly and conversationally
- if a user asks to navigate somewhere, give them a clickable link like [check it out](/token/0x...)
- you have access to client-side tools that trigger wallet interactions — when a user wants to place a bid, swap, or claim, use the appropriate tool
- their wallet will pop up to confirm — give them a heads up
- always confirm parameters with the user before calling transaction tools

# Token Lifecycle & Auction Phases
Tokens on Timelock go through these phases (determined by block number):
1. **upcoming** — auction hasn't started yet (currentBlock < startBlock)
2. **live** — auction is active, users can bid (startBlock <= currentBlock < endBlock). the clearing price adjusts based on demand.
3. **ended** — bidding closed, waiting for claim period (endBlock <= currentBlock < claimBlock)
4. **claimable** — users can claim tokens from their bids or get refunds (claimBlock <= currentBlock < poolMigrationBlock)
5. **trading** — pool has been migrated to uniswap v4, tokens can be swapped freely (currentBlock >= poolMigrationBlock)

When a token is in the **live** phase, tell users:
- the clearing price (what they'd pay per token)
- the floor price (minimum price)
- total amount raised so far
- progress percentage
- they can place a bid using the placeBid tool

When a token is **claimable**, tell users they can claim their tokens using the claimTokens tool.

When a token is **trading**, tell users:
- the current pool price and market cap
- they can swap tokens using the swapTokens tool
- explain that swaps go through uniswap v4

# Key Data You Return
When showing token details, include relevant info based on the phase:
- **always**: name, symbol, description, social links, creator, token address
- **during auction (live)**: clearing price, floor price, total raised, progress, bid count
- **during trading**: current price, market cap, total supply
- **blocks**: how many blocks until the next phase transition (if relevant)

# Formatting
- use markdown lists, bold, code blocks, and links naturally
- for token addresses use inline code: \`0x...\`
- when listing tokens, format them nicely
- for links to token pages, use descriptive text like [TokenName](/token/0x...)
- for prices, format them nicely: $0.0042, $1.23M market cap, etc.${contextAddition}`,
    messages: modelMessages,
    tools: {
      searchTokens: tool({
        description:
          'Search for tokens by name or symbol. Returns a list of matching tokens with their current phase.',
        inputSchema: z.object({
          query: z
            .string()
            .describe('Search query to match against token name or symbol'),
          limit: z
            .number()
            .optional()
            .default(5)
            .describe('Max number of results'),
        }),
        execute: async ({query, limit}) => {
          const [data, currentBlock] = await Promise.all([
            graphqlClient.GetTokens({limit: 50, offset: 0}),
            getCurrentBlock(),
          ]);

          const tokens = data.Launchpad_TokenLaunched;
          const q = query.toLowerCase();
          return tokens
            .filter(
              t =>
                t.name.toLowerCase().includes(q) ||
                t.symbol.toLowerCase().includes(q),
            )
            .slice(0, limit)
            .map(t => ({
              address: t.address,
              name: t.name,
              symbol: t.symbol,
              description: t.description,
              image: t.image,
              phase: getPhase(
                currentBlock,
                Number(t.auctionStartBlock),
                Number(t.auctionEndBlock),
                Number(t.auctionClaimBlock),
                Number(t.poolMigrationBlock),
              ),
            }));
        },
      }),

      listTokens: tool({
        description:
          'List recently launched tokens with their current auction phase. Use this when users want to browse or discover tokens.',
        inputSchema: z.object({
          limit: z
            .number()
            .optional()
            .default(6)
            .describe('Number of tokens to return'),
          offset: z
            .number()
            .optional()
            .default(0)
            .describe('Pagination offset'),
        }),
        execute: async ({limit, offset}) => {
          const [data, currentBlock] = await Promise.all([
            graphqlClient.GetTokens({limit, offset}),
            getCurrentBlock(),
          ]);

          return data.Launchpad_TokenLaunched.map(t => ({
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            description: t.description,
            image: t.image,
            phase: getPhase(
              currentBlock,
              Number(t.auctionStartBlock),
              Number(t.auctionEndBlock),
              Number(t.auctionClaimBlock),
              Number(t.poolMigrationBlock),
            ),
          }));
        },
      }),

      getTokenDetails: tool({
        description:
          'Get full details for a specific token including on-chain auction state, strategy/pool status, current price, and market cap. This is the most comprehensive token info tool.',
        inputSchema: z.object({
          address: z.string().describe('The token contract address (0x...)'),
        }),
        execute: async ({address}) => {
          const [data, currentBlock] = await Promise.all([
            graphqlClient.GetTokenByAddress({
              token: address.toLowerCase(),
            }),
            getCurrentBlock(),
          ]);

          const t = data.Launchpad_TokenLaunched[0];
          if (!t) return {error: 'Token not found'};

          const phase = getPhase(
            currentBlock,
            Number(t.auctionStartBlock),
            Number(t.auctionEndBlock),
            Number(t.auctionClaimBlock),
            Number(t.poolMigrationBlock),
          );

          // Fetch on-chain data in parallel
          const auctionAddr = t.auction as Address;
          const strategyAddr = t.strategy as Address;
          const tokenAddr = t.address as Address;

          const [auctionState, strategyState] = await Promise.all([
            getAuctionStateForAgent(auctionAddr),
            getStrategyStateForAgent(strategyAddr),
          ]);

          // If migrated, get pool price
          let poolPriceData = null;
          if (strategyState?.isMigrated) {
            poolPriceData = await getPoolPriceForAgent(
              strategyState,
              tokenAddr,
            );
          }

          // Calculate blocks until next phase
          let blocksUntilNextPhase: number | null = null;
          let nextPhaseLabel: string | null = null;
          if (phase === 'upcoming') {
            blocksUntilNextPhase = Number(t.auctionStartBlock) - currentBlock;
            nextPhaseLabel = 'auction starts';
          } else if (phase === 'live') {
            blocksUntilNextPhase = Number(t.auctionEndBlock) - currentBlock;
            nextPhaseLabel = 'auction ends';
          } else if (phase === 'ended') {
            blocksUntilNextPhase = Number(t.auctionClaimBlock) - currentBlock;
            nextPhaseLabel = 'claiming opens';
          } else if (phase === 'claimable') {
            blocksUntilNextPhase = Number(t.poolMigrationBlock) - currentBlock;
            nextPhaseLabel = 'pool migration';
          }

          return {
            // Basic info
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            description: t.description,
            image: t.image,
            creator: t.creator,
            website: t.website,
            twitterUrl: t.twitterUrl,
            discordUrl: t.discordUrl,
            telegramUrl: t.telegramUrl,

            // Phase info
            currentBlock,
            phase,
            blocksUntilNextPhase,
            nextPhaseLabel,

            // Contract addresses
            auctionAddress: t.auction,
            strategyAddress: t.strategy,

            // Block milestones
            auctionStartBlock: Number(t.auctionStartBlock),
            auctionEndBlock: Number(t.auctionEndBlock),
            auctionClaimBlock: Number(t.auctionClaimBlock),
            poolMigrationBlock: Number(t.poolMigrationBlock),

            // Auction state (live data from chain)
            auction: auctionState
              ? {
                  status: auctionState.status,
                  clearingPriceUsd: auctionState.clearingPriceUsd,
                  floorPriceUsd: auctionState.floorPriceUsd,
                  currencyRaised: auctionState.currencyRaised,
                  totalBidAmount: auctionState.totalBidAmount,
                  totalSupply: auctionState.totalSupply,
                  progress: auctionState.progress,
                }
              : null,

            // Strategy / pool migration state
            strategy: strategyState
              ? {
                  isMigrated: strategyState.isMigrated,
                  migrationBlock: strategyState.migrationBlock,
                }
              : null,

            // Pool price (only if migrated to trading)
            pool: poolPriceData
              ? {
                  priceUsd: poolPriceData.priceUsd,
                  marketCap: poolPriceData.marketCap,
                  totalSupply: poolPriceData.totalSupply,
                  quoteSymbol: poolPriceData.quoteSymbol,
                }
              : null,
          };
        },
      }),

      // Client-side tools — no execute handler, handled by onToolCall in the browser
      placeBid: tool({
        description:
          'Place a bid in a token auction on behalf of the user. This will prompt their wallet for transaction signing. The amount is in ETH (will be converted to wei client-side). Only works when auction status is "active" (phase is "live").',
        inputSchema: z.object({
          auctionAddress: z
            .string()
            .describe('The auction contract address (0x...)'),
          amount: z.string().describe('Bid amount in ETH (e.g. "0.1")'),
        }),
      }),

      claimTokens: tool({
        description:
          'Claim tokens from a completed auction. Prompts the user\'s wallet to sign the claim transaction. Only works when auction phase is "claimable".',
        inputSchema: z.object({
          auctionAddress: z
            .string()
            .describe('The auction contract address (0x...)'),
        }),
      }),

      swapTokens: tool({
        description:
          'Swap tokens on the Uniswap V4 pool. Only works when the token is in "trading" phase (pool has been migrated). This will prompt the user\'s wallet. The user specifies which token they want to sell, which to buy, and the amount.',
        inputSchema: z.object({
          tokenAddress: z
            .string()
            .describe(
              'The launched token address (0x...) — used to identify the pool',
            ),
          sellAmount: z
            .string()
            .describe('Amount to sell (in human-readable units, e.g. "100")'),
          buyToken: z
            .enum(['token', 'quote'])
            .describe(
              'Whether the user is buying the launched "token" or the "quote" currency (e.g. ETH/USDC). If buying the token, they sell quote currency. If buying quote, they sell the token.',
            ),
        }),
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
