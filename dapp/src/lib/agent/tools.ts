import type {Address} from 'viem';
import {tool} from 'ai';
import {z} from 'zod';
import {graphqlClient} from '~/graphql/client';
import type {
  LaunchpadTokenLaunchedBoolExp,
  LaunchpadTokenLaunchedOrderBy,
} from '~/graphql/generated';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {env} from '~/lib/env';
import {publicClient} from '~/lib/wagmi-config';
import {
  getAuctionStateForAgent,
  getStrategyStateForAgent,
  getPoolPriceForAgent,
  getCurrentBlock,
  getPhase,
} from './on-chain';

/** Common coin ID aliases so users can say "btc" instead of "bitcoin" */
const COIN_ALIASES: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  dot: 'polkadot',
  avax: 'avalanche-2',
  matic: 'polygon-ecosystem-token',
  link: 'chainlink',
  uni: 'uniswap',
  aave: 'aave',
  arb: 'arbitrum',
  op: 'optimism',
  atom: 'cosmos',
  near: 'near',
  apt: 'aptos',
  sui: 'sui',
  pepe: 'pepe',
  shib: 'shiba-inu',
  wbtc: 'wrapped-bitcoin',
  usdc: 'usd-coin',
  usdt: 'tether',
  dai: 'dai',
};

function resolveCoinId(query: string): string {
  const q = query.toLowerCase().trim();
  return COIN_ALIASES[q] ?? q;
}

/**
 * Build a Hasura `where` clause from the agent's filter parameters.
 * Phase filtering uses block-number comparisons against the current block.
 */
function buildTokenWhere(
  params: {
    search?: string;
    phase?:
      | 'upcoming'
      | 'live'
      | 'ended'
      | 'claimable'
      | 'not_trading'
      | 'trading';
    creator?: string;
    createdAfter?: number;
    createdBefore?: number;
  },
  currentBlock: number,
): LaunchpadTokenLaunchedBoolExp {
  const conditions: LaunchpadTokenLaunchedBoolExp[] = [];

  if (params.search) {
    const pattern = `%${params.search}%`;
    conditions.push({
      _or: [
        {name: {_ilike: pattern}},
        {symbol: {_ilike: pattern}},
        {description: {_ilike: pattern}},
      ],
    });
  }

  if (params.creator) {
    conditions.push({creator: {_eq: params.creator.toLowerCase()}});
  }

  if (params.createdAfter) {
    conditions.push({createdAt: {_gte: params.createdAfter}});
  }
  if (params.createdBefore) {
    conditions.push({createdAt: {_lte: params.createdBefore}});
  }

  // Phase filtering via block-number ranges
  const block = String(currentBlock);
  if (params.phase === 'upcoming') {
    conditions.push({auctionStartBlock: {_gt: block}});
  } else if (params.phase === 'live') {
    conditions.push({
      auctionStartBlock: {_lte: block},
      auctionEndBlock: {_gt: block},
    });
  } else if (params.phase === 'ended') {
    conditions.push({
      auctionEndBlock: {_lte: block},
      auctionClaimBlock: {_gt: block},
    });
  } else if (params.phase === 'claimable') {
    conditions.push({
      auctionClaimBlock: {_lte: block},
      poolMigrationBlock: {_gt: block},
    });
  } else if (params.phase === 'not_trading') {
    // Auction finished (endBlock passed) but not yet migrated to pool
    conditions.push({
      auctionEndBlock: {_lte: block},
      poolMigrationBlock: {_gt: block},
    });
  } else if (params.phase === 'trading') {
    conditions.push({poolMigrationBlock: {_lte: block}});
  }

  return conditions.length > 0 ? {_and: conditions} : {};
}

/** Map user-friendly sort keys to Hasura order_by objects. */
function buildTokenOrderBy(sortBy?: string): LaunchpadTokenLaunchedOrderBy[] {
  switch (sortBy) {
    case 'newest':
      return [{createdAt: 'desc'}];
    case 'oldest':
      return [{createdAt: 'asc'}];
    case 'name_asc':
      return [{name: 'asc'}];
    case 'name_desc':
      return [{name: 'desc'}];
    case 'symbol_asc':
      return [{symbol: 'asc'}];
    case 'symbol_desc':
      return [{symbol: 'desc'}];
    case 'auction_start_soonest':
      return [{auctionStartBlock: 'asc'}];
    case 'auction_end_soonest':
      return [{auctionEndBlock: 'asc'}];
    default:
      return [{createdAt: 'desc'}];
  }
}

/** Fetch full details for a single token (shared by getTokenDetails and getTokenDetailsBatch). */
async function fetchTokenDetails(address: string) {
  const [data, currentBlock] = await Promise.all([
    graphqlClient.GetTokenByAddress({
      token: address.toLowerCase(),
    }),
    getCurrentBlock(),
  ]);

  const t = data.Launchpad_TokenLaunched[0];
  if (!t) return {error: 'Token not found', address};

  const phase = getPhase(
    currentBlock,
    Number(t.auctionStartBlock),
    Number(t.auctionEndBlock),
    Number(t.auctionClaimBlock),
    Number(t.poolMigrationBlock),
  );

  const auctionAddr = t.auction as Address;
  const strategyAddr = t.strategy as Address;
  const tokenAddr = t.address as Address;

  const [auctionState, strategyState] = await Promise.all([
    getAuctionStateForAgent(auctionAddr),
    getStrategyStateForAgent(strategyAddr),
  ]);

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

  let poolPriceData = null;
  if (strategyState?.isMigrated) {
    poolPriceData = await getPoolPriceForAgent(strategyState, tokenAddr);
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

  return {
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
    currentBlock,
    phase,
    blocksUntilNextPhase,
    nextPhaseLabel,
    auctionAddress: t.auction,
    strategyAddress: t.strategy,
    quoteCurrency,
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
}

/** Server-side tools — have execute handlers that run on the server */
export const serverTools = {
  discoverTokens: tool({
    description: `Search, filter, and sort tokens on the platform. This is the primary tool for finding tokens.

Examples of what users might ask:
- "show me tokens" → no filters
- "find tokens with dog in the name" → search: "dog"
- "which tokens are currently in auction?" → phase: "live"
- "tokens launching soon" → phase: "upcoming"
- "tokens I can trade right now" → phase: "trading"
- "tokens where I can claim" → phase: "claimable"
- "tokens created by 0xabc..." → creator: "0xabc..."
- "newest tokens" → sortBy: "newest"
- "tokens created in the last week" → createdAfter: (unix timestamp 7 days ago)
- "show me live auctions sorted by name" → phase: "live", sortBy: "name_asc"
- "tokens done with auction but not trading yet" → phase: "not_trading"`,
    inputSchema: z.object({
      search: z
        .string()
        .optional()
        .describe(
          'Search query — matches against token name, symbol, and description (case-insensitive)',
        ),
      phase: z
        .enum([
          'upcoming',
          'live',
          'ended',
          'claimable',
          'not_trading',
          'trading',
        ])
        .optional()
        .describe(
          'Filter by auction phase. upcoming = not started, live = bidding active, ended = bidding closed, claimable = claim tokens, not_trading = auction finished but not migrated to DEX yet (ended + claimable), trading = on DEX',
        ),
      creator: z
        .string()
        .optional()
        .describe('Filter by creator wallet address (0x...)'),
      createdAfter: z
        .number()
        .optional()
        .describe(
          'Only tokens created after this unix timestamp (seconds). E.g. for "last 7 days" use now minus 604800',
        ),
      createdBefore: z
        .number()
        .optional()
        .describe(
          'Only tokens created before this unix timestamp (seconds). Use with createdAfter for date ranges',
        ),
      sortBy: z
        .enum([
          'newest',
          'oldest',
          'name_asc',
          'name_desc',
          'symbol_asc',
          'symbol_desc',
          'auction_start_soonest',
          'auction_end_soonest',
        ])
        .optional()
        .default('newest')
        .describe('How to sort results. Default: newest first'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Max number of results to return (default 10, max 50)'),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe('Pagination offset for fetching more results'),
    }),
    execute: async ({
      search,
      phase,
      creator,
      createdAfter,
      createdBefore,
      sortBy,
      limit,
      offset,
    }) => {
      const effectiveLimit = Math.min(limit, 50);
      const currentBlock = await getCurrentBlock();

      const where = buildTokenWhere(
        {search, phase, creator, createdAfter, createdBefore},
        currentBlock,
      );
      const order_by = buildTokenOrderBy(sortBy);

      const data = await graphqlClient.FilterTokens({
        limit: effectiveLimit,
        offset,
        where,
        order_by,
      });

      const tokens = data.Launchpad_TokenLaunched.map(t => ({
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        description: t.description,
        image: t.image,
        creator: t.creator,
        createdAt: t.createdAt,
        phase: getPhase(
          currentBlock,
          Number(t.auctionStartBlock),
          Number(t.auctionEndBlock),
          Number(t.auctionClaimBlock),
          Number(t.poolMigrationBlock),
        ),
      }));

      return {
        tokens,
        count: tokens.length,
        offset,
        hasMore: tokens.length === effectiveLimit,
        currentBlock,
        filters: {
          ...(search && {search}),
          ...(phase && {phase}),
          ...(creator && {creator}),
          ...(createdAfter && {createdAfter}),
          ...(createdBefore && {createdBefore}),
          sortBy: sortBy ?? 'newest',
        },
      };
    },
  }),

  getTokenDetails: tool({
    description:
      'Get full details for a specific token including on-chain auction state, strategy/pool status, current price, and market cap. Use getTokenDetailsBatch when you need details for multiple tokens.',
    inputSchema: z.object({
      address: z.string().describe('The token contract address (0x...)'),
    }),
    execute: async ({address}) => {
      return fetchTokenDetails(address);
    },
  }),

  getTokenDetailsBatch: tool({
    description:
      'Get full details for multiple tokens in one call. Returns an array of token details (same data as getTokenDetails). Use this instead of calling getTokenDetails multiple times — much faster.',
    inputSchema: z.object({
      addresses: z
        .array(z.string())
        .min(1)
        .max(20)
        .describe(
          'Array of token contract addresses (0x...). Max 20 at a time.',
        ),
    }),
    execute: async ({addresses}) => {
      const results = await Promise.all(
        addresses.map(addr => fetchTokenDetails(addr)),
      );
      return results;
    },
  }),

  getTokenPrice: tool({
    description:
      'Get the current price of any cryptocurrency by name or ticker symbol (e.g. "btc", "ethereum", "sol"). Returns USD price, 24h change, market cap, and volume. Use this when users ask about crypto prices.',
    inputSchema: z.object({
      coin: z
        .string()
        .describe(
          'Coin name or ticker symbol (e.g. "btc", "bitcoin", "eth", "solana", "doge")',
        ),
    }),
    execute: async ({coin}) => {
      const coinId = resolveCoinId(coin);
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coinId)}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          return {error: `CoinGecko API error: ${res.status}`};
        }
        const data = (await res.json()) as Record<
          string,
          {
            usd?: number;
            usd_24h_change?: number;
            usd_market_cap?: number;
            usd_24h_vol?: number;
          }
        >;
        const info = data[coinId];
        if (!info || info.usd === undefined) {
          return {
            error: `Coin "${coin}" not found. Try using the full name (e.g. "bitcoin") or a common ticker (e.g. "btc").`,
          };
        }
        return {
          coin: coinId,
          price: info.usd,
          change24h: info.usd_24h_change
            ? `${info.usd_24h_change.toFixed(2)}%`
            : null,
          marketCap: info.usd_market_cap ?? null,
          volume24h: info.usd_24h_vol ?? null,
        };
      } catch (err) {
        return {
          error:
            err instanceof Error ? err.message : 'Failed to fetch price data',
        };
      }
    },
  }),
};

/** Client-side tools — no execute handler, handled by onToolCall in the browser */
export const clientTools = {
  getBalances: tool({
    description:
      "Get the connected wallet's token balances for a specific launched token and its quote currency. Use this when the user asks about their balance, or to show balances before/after actions.",
    inputSchema: z.object({
      tokenAddress: z.string().describe('The launched token address (0x...)'),
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
      'Get a swap quote with before/after balances and price impact. ALWAYS call this first before any swap. Returns the quote, user balances, and whether token approval is needed. Only works when token is in "trading" phase. Supports multi-hop swaps through USDC for non-USDC quote tokens (ETH, USDT, WBTC, DAI).',
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
          'Whether the user is buying the launched "token" or the "quote" currency.',
        ),
      quoteToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .optional()
        .default('USDC')
        .describe(
          'Which quote currency to swap with. Defaults to USDC (single-hop). Non-USDC tokens route through USDC as a 2-hop swap.',
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
      quoteToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .optional()
        .default('USDC')
        .describe('Same quote currency as in previewSwap.'),
    }),
  }),

  executeSwapExactInput: tool({
    description:
      "Execute the swap after preview and approval. Only call this AFTER previewSwap (and approveIfNeeded if needed). Prompts the user's wallet to sign the swap transaction. Supports multi-hop swaps through USDC for non-USDC quote tokens.",
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
      quoteToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .optional()
        .default('USDC')
        .describe('Same quote currency as in previewSwap.'),
    }),
  }),

  previewSwapExactOutput: tool({
    description:
      'Get a swap quote when the user specifies an exact OUTPUT amount they want to receive (e.g. "I want to receive exactly 0.001 WBTC"). Returns the estimated input amount needed, max input with slippage, balances, and whether approval is needed. Use this instead of previewSwap when the user specifies how much they want to receive rather than how much they want to sell.',
    inputSchema: z.object({
      tokenAddress: z
        .string()
        .describe(
          'The launched token address (0x...) — used to identify the pool',
        ),
      receiveAmount: z
        .string()
        .describe(
          'Exact amount the user wants to receive (in human-readable units, e.g. "0.001")',
        ),
      buyToken: z
        .enum(['token', 'quote'])
        .describe(
          'Whether the user is buying the launched "token" or the "quote" currency.',
        ),
      quoteToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .optional()
        .default('USDC')
        .describe(
          'Which quote currency to swap with. Defaults to USDC (single-hop). Non-USDC tokens route through USDC as a 2-hop swap.',
        ),
    }),
  }),

  executeSwapExactOutput: tool({
    description:
      "Execute an exact output swap after previewSwapExactOutput and approval. Only call this AFTER previewSwapExactOutput (and approveIfNeeded if needed). Prompts the user's wallet to sign the swap transaction. The user will receive exactly the specified amount; the input amount may vary up to the max with slippage.",
    inputSchema: z.object({
      tokenAddress: z
        .string()
        .describe(
          'The launched token address (0x...) — used to identify the pool',
        ),
      receiveAmount: z
        .string()
        .describe(
          'Exact amount to receive (same as in previewSwapExactOutput)',
        ),
      buyToken: z
        .enum(['token', 'quote'])
        .describe('Same direction as in previewSwapExactOutput.'),
      quoteToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .optional()
        .default('USDC')
        .describe('Same quote currency as in previewSwapExactOutput.'),
    }),
  }),

  // ── General swap tools (quote-to-quote, no launched token needed) ────────

  previewGeneralSwap: tool({
    description:
      'Preview a swap between two well-known tokens (USDC, ETH, USDT, WBTC, DAI) — no launched token needed. Use this when both sides of the swap are standard tokens (e.g. "swap 1 ETH for USDC", "swap BTC for DAI"). Returns quote, balances, route, and whether approval is needed.',
    inputSchema: z.object({
      fromToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token to sell'),
      toToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token to buy'),
      sellAmount: z
        .string()
        .describe('Amount to sell (in human-readable units, e.g. "1.5")'),
    }),
  }),

  approveGeneralSwap: tool({
    description:
      'Approve token spending for a general swap. Only call if previewGeneralSwap indicated approval is needed. Not needed for selling ETH.',
    inputSchema: z.object({
      fromToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token being sold (same as in preview)'),
      sellAmount: z.string().describe('Amount to sell (same as in preview)'),
    }),
  }),

  executeGeneralSwap: tool({
    description:
      'Execute a general swap after preview and approval. Only call AFTER previewGeneralSwap (and approveGeneralSwap if needed).',
    inputSchema: z.object({
      fromToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token to sell'),
      toToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token to buy'),
      sellAmount: z.string().describe('Amount to sell (same as in preview)'),
    }),
  }),

  previewGeneralSwapExactOutput: tool({
    description:
      'Preview a general swap where the user specifies an exact output amount (e.g. "I want exactly 100 USDC"). Use when both sides are standard tokens and the desired receive amount is known.',
    inputSchema: z.object({
      fromToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token to sell'),
      toToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token to receive'),
      receiveAmount: z
        .string()
        .describe(
          'Exact amount to receive (in human-readable units, e.g. "100")',
        ),
    }),
  }),

  executeGeneralSwapExactOutput: tool({
    description:
      'Execute a general exact-output swap after preview and approval. The user receives exactly the specified amount; the input may vary up to the max with slippage.',
    inputSchema: z.object({
      fromToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token to sell'),
      toToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token to receive'),
      receiveAmount: z
        .string()
        .describe('Exact amount to receive (same as in preview)'),
    }),
  }),

  suggestReplies: tool({
    description:
      'Show 2-3 short clickable reply suggestions (max 4 words each) so the user can tap instead of typing. Use this whenever you ask the user a question or present a choice. Examples: after a swap preview use ["yes, do it", "no, cancel"]; after showing token info use ["bid on it", "show more"]; when asking which token use the token symbols as options. Each reply can be a plain string or an object with { text, timerSeconds } — use timerSeconds to show a countdown that disables the button until it expires (e.g. for the 60-second ENS commitment wait).',
    inputSchema: z.object({
      replies: z
        .array(
          z.union([
            z.string(),
            z.object({
              text: z.string().describe('The reply button label'),
              timerSeconds: z
                .number()
                .optional()
                .describe(
                  'If set, the button is disabled with a countdown timer for this many seconds before it becomes clickable.',
                ),
            }),
          ]),
        )
        .min(2)
        .max(3)
        .describe(
          'Short reply options (max 4 words each) for the user to pick from. Use { text, timerSeconds } for replies that need a countdown.',
        ),
    }),
  }),

  // ── ENS tools ─────────────────────────────────────────────────────────────

  getMyEnsName: tool({
    description:
      "Look up the connected wallet's primary ENS name (reverse resolution). Returns the name that the user's address currently resolves to, or null if none is set. Use this when the user asks about their ENS name, identity, or username.",
    inputSchema: z.object({}),
  }),

  checkEnsName: tool({
    description:
      'Check if an ENS name is available, already owned by the user, or taken by someone else. Also returns the yearly rent price if available. Use this when the user wants to check a name before buying.',
    inputSchema: z.object({
      name: z
        .string()
        .describe('The ENS name to check (without .eth suffix, e.g. "myname")'),
    }),
  }),

  commitEnsName: tool({
    description:
      'Step 1 of ENS registration: submit a commitment for a name. This is required before registering. After committing, the user must wait ~60 seconds before they can call registerEnsName. Prompts wallet for a transaction. Only call this after checkEnsName confirms the name is available.',
    inputSchema: z.object({
      name: z
        .string()
        .describe('The ENS name to commit to (without .eth suffix)'),
    }),
  }),

  registerEnsName: tool({
    description:
      'Step 2 of ENS registration: register the name after the commitment has matured (~60 seconds after commitEnsName). Prompts wallet for a transaction with ETH payment. Only call this after commitEnsName succeeded AND at least 60 seconds have passed. This also sets the name as the primary reverse record.',
    inputSchema: z.object({
      name: z
        .string()
        .describe('The ENS name to register (without .eth suffix)'),
    }),
  }),

  setPrimaryEnsName: tool({
    description:
      'Change which ENS name the connected wallet resolves to (set primary/reverse record). The user must already own the name. Use this when the user wants to switch their display name to a different ENS name they own.',
    inputSchema: z.object({
      name: z
        .string()
        .describe(
          'The ENS name to set as primary (without .eth suffix, e.g. "myname")',
        ),
    }),
  }),
};

export const allTools = {...serverTools, ...clientTools};
