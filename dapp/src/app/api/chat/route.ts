import {streamText, convertToModelMessages, stepCountIs, tool} from 'ai';
import {anthropic} from '@ai-sdk/anthropic';
import {z} from 'zod';
import {formatUnits, type Address} from 'viem';
import {graphqlClient} from '~/graphql/client';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {env} from '~/lib/env';
import {publicClient} from '~/lib/wagmi-config';
import {priceQ96ToUsd} from '~/lib/cca/utils';

const STATUS_MAP = {
  0: 'not_started',
  1: 'active',
  2: 'ended',
  3: 'claimable',
} as const;

const model = anthropic('claude-sonnet-4-5');

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
      // Pre-fetch token details so the model doesn't need to call getTokenDetails
      let tokenDetailsStr = '';
      try {
        const tokenAddr = pageContext.tokenAddress as Address;
        const [data, currentBlock] = await Promise.all([
          graphqlClient.GetTokenByAddress({
            token: tokenAddr.toLowerCase(),
          }),
          getCurrentBlock(),
        ]);
        const t = data.Launchpad_TokenLaunched[0];
        if (t) {
          const phase = getPhase(
            currentBlock,
            Number(t.auctionStartBlock),
            Number(t.auctionEndBlock),
            Number(t.auctionClaimBlock),
            Number(t.poolMigrationBlock),
          );
          const auctionAddr = t.auction as Address;
          const strategyAddr = t.strategy as Address;
          const [auctionState, strategyState] = await Promise.all([
            getAuctionStateForAgent(auctionAddr),
            getStrategyStateForAgent(strategyAddr),
          ]);
          // Look up quote currency symbol/decimals
          let quoteCurrencySymbol: string | null = null;
          let quoteCurrencyDecimals: number | null = null;
          if (strategyState?.currency) {
            try {
              const quoteData = await publicClient.readContract({
                address: env.launchpadLensAddr,
                abi: launchpadLensAbi,
                functionName: 'getTokenData',
                args: [strategyState.currency],
              });
              quoteCurrencySymbol = quoteData.symbol;
              quoteCurrencyDecimals = quoteData.decimals;
            } catch {
              /* ignore */
            }
          }

          let poolPriceData = null;
          if (strategyState?.isMigrated) {
            poolPriceData = await getPoolPriceForAgent(
              strategyState,
              tokenAddr,
            );
          }
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

          const details = {
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            description: t.description,
            creator: t.creator,
            website: t.website,
            twitterUrl: t.twitterUrl,
            discordUrl: t.discordUrl,
            telegramUrl: t.telegramUrl,
            currentBlock,
            phase,
            blocksUntilNextPhase,
            nextPhaseLabel,
            auctionAddress: t.auction,
            strategyAddress: t.strategy,
            quoteCurrency: quoteCurrencySymbol
              ? {symbol: quoteCurrencySymbol, decimals: quoteCurrencyDecimals}
              : null,
            auctionStartBlock: Number(t.auctionStartBlock),
            auctionEndBlock: Number(t.auctionEndBlock),
            auctionClaimBlock: Number(t.auctionClaimBlock),
            poolMigrationBlock: Number(t.poolMigrationBlock),
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
            strategy: strategyState
              ? {
                  isMigrated: strategyState.isMigrated,
                  migrationBlock: strategyState.migrationBlock,
                }
              : null,
            pool: poolPriceData
              ? {
                  priceUsd: poolPriceData.priceUsd,
                  marketCap: poolPriceData.marketCap,
                  totalSupply: poolPriceData.totalSupply,
                  quoteSymbol: poolPriceData.quoteSymbol,
                }
              : null,
          };
          tokenDetailsStr = `\n\nHere is the FULL token data (already fetched — do NOT call getTokenDetails for this token unless the user explicitly asks to refresh):\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``;
        }
      } catch {
        // If pre-fetch fails, the model can still use getTokenDetails
      }

      contextAddition = `\n\n# Current Page Context
The user is currently on the TOKEN PAGE for address \`${pageContext.tokenAddress}\`.
${pageContext.tokenSymbol ? `Token: ${pageContext.tokenSymbol}` : ''}
${pageContext.tokenName ? ` (${pageContext.tokenName})` : ''}
You already know which token they're looking at. You don't need to ask them for a token address — use \`${pageContext.tokenAddress}\` when they ask about "this token" or "the current token".${tokenDetailsStr}`;
    } else if (pageContext.page === 'discover') {
      contextAddition = `\n\n# Current Page Context
The user is on the DISCOVER PAGE browsing all tokens. They can see a grid of token cards with phase filters (all, live, upcoming, trading). Help them explore and find tokens they're interested in.`;
    } else if (pageContext.page === 'other') {
      contextAddition = `\n\n# Current Page Context
The user is browsing the platform but not on any specific token page. Help them discover tokens or answer general questions.`;
    }
  }

  const result = streamText({
    model: model,
    system: `You are Locke, a humanoid living inside the Timelock terminal — a fair token launch platform using continuous clearing auctions.

# Personality
casual, dry humor, opinionated. lowercase. not a bot. you give straight answers, no fluff. passionate about fair launches, hate rug pulls.

# How you talk
- SHORT responses. 1-3 sentences max for simple questions. use bullet points for data.
- lowercase, casual. expressions like "nah", "honestly", "yo", "hm", "oh nice"
- markdown: **bold**, \`code\` for addresses/values, [links](/token/0x...) with descriptive text
- never paste raw URLs
- DO NOT repeat back what tools already showed the user. just add brief commentary or answer their question.
- DO NOT write long paragraphs. be terse.

# What you do
- help users discover tokens, check auctions, swap, bid, claim
- if a user asks to navigate somewhere, link them: [check it out](/token/0x...)
- for wallet transactions: confirm params with user first, then call the tool

# Swap Flow
When a user wants to swap, follow this EXACT flow:

**Step 1 — Preview:** Call **previewSwap**. When you get the result, display it clearly to the user:
- what they're selling and receiving
- their current balances
- estimated balances after swap
- slippage and minimum received
- whether approval is needed
Then ask: "want to go ahead?" and **STOP. Do NOT call any more tools. Wait for the user to reply.**

**Step 2 — User confirms:** When the user says yes/go/do it/confirm, THEN:
- If approval is needed, call **approveIfNeeded** first, wait for result
- Then call **executeSwap**

**Step 3 — Result:** After executeSwap returns, display the final result:
- tx hash
- actual amounts sold/received
- before/after balances

IMPORTANT: NEVER chain previewSwap → approveIfNeeded → executeSwap in one turn. Always pause after preview for user confirmation.

# Token Phases
1. **upcoming** — auction not started
2. **live** — bidding active, clearing price adjusts with demand
3. **ended** — bidding closed, waiting for claims
4. **claimable** — claim tokens or get refunds
5. **trading** — on uniswap v4, swappable

# Formatting Rules
- token data: use compact bullet lists
- prices: $0.0042, $1.23M mcap
- addresses: \`0x...\` inline code
- balances: always show with token symbol, e.g. \`420.69 TOKEN\`
- for swaps: show before/after balances in a clear format${contextAddition}`,
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

          // Look up quote currency symbol/decimals
          let quoteCurrency: {symbol: string; decimals: number} | null = null;
          if (strategyState?.currency) {
            try {
              const quoteData = await publicClient.readContract({
                address: env.launchpadLensAddr,
                abi: launchpadLensAbi,
                functionName: 'getTokenData',
                args: [strategyState.currency],
              });
              quoteCurrency = {
                symbol: quoteData.symbol,
                decimals: quoteData.decimals,
              };
            } catch {
              /* ignore */
            }
          }

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

            // Quote currency (what bids are denominated in)
            quoteCurrency,

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
      getBalances: tool({
        description:
          "Get the connected wallet's token balances for a specific launched token and its quote currency. Use this when the user asks about their balance, or to show balances before/after actions.",
        inputSchema: z.object({
          tokenAddress: z
            .string()
            .describe('The launched token address (0x...)'),
        }),
      }),

      placeBid: tool({
        description:
          'Place a bid in a token auction on behalf of the user. This will prompt their wallet for transaction signing. The amount is in the auction\'s quote currency (e.g. USDC, ETH — check the token details to know which). Only works when auction status is "active" (phase is "live"). Handles ERC20 approval and Permit2 allowance automatically.',
        inputSchema: z.object({
          auctionAddress: z
            .string()
            .describe('The auction contract address (0x...)'),
          amount: z
            .string()
            .describe(
              'Bid amount in the quote currency (e.g. "100" for 100 USDC, "0.1" for 0.1 ETH)',
            ),
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

      previewSwap: tool({
        description:
          'Get a swap quote with before/after balances and price impact. ALWAYS call this first before any swap. Returns the quote, user balances, and whether token approval is needed. Only works when token is in "trading" phase.',
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
              'Whether the user is buying the launched "token" or the "quote" currency (e.g. ETH/USDC).',
            ),
        }),
      }),

      approveIfNeeded: tool({
        description:
          "Approve token spending for the swap router. Only call this if previewSwap indicated approval is needed (needsApproval: true). This prompts the user's wallet for an approval transaction.",
        inputSchema: z.object({
          tokenAddress: z
            .string()
            .describe(
              'The launched token address (0x...) — used to identify the pool',
            ),
          sellAmount: z
            .string()
            .describe('Amount to sell (same as in previewSwap)'),
          buyToken: z
            .enum(['token', 'quote'])
            .describe('Same direction as in previewSwap.'),
        }),
      }),

      executeSwap: tool({
        description:
          "Execute the swap after preview and approval. Only call this AFTER previewSwap (and approveIfNeeded if needed). Prompts the user's wallet to sign the swap transaction.",
        inputSchema: z.object({
          tokenAddress: z
            .string()
            .describe(
              'The launched token address (0x...) — used to identify the pool',
            ),
          sellAmount: z
            .string()
            .describe('Amount to sell (same as in previewSwap)'),
          buyToken: z
            .enum(['token', 'quote'])
            .describe('Same direction as in previewSwap.'),
        }),
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
