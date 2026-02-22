import type {Address} from 'viem';
import {tool} from 'ai';
import {z} from 'zod';
import {graphqlClient} from '~/graphql/client';
import type {
  LaunchpadTokenLaunchedBoolExp,
  LaunchpadTokenLaunchedOrderBy,
} from '~/graphql/generated';
import {
  getPoolPriceForAgent,
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
 * Build a Hasura where clause from the agent's filter parameters.
 */
function buildTokenWhere(
  params: {
    search?: string;
    creator?: string;
    createdAfter?: number;
    createdBefore?: number;
  },
): LaunchpadTokenLaunchedBoolExp {
  const conditions: LaunchpadTokenLaunchedBoolExp[] = [];

  if (params.search) {
    const pattern = '%' + params.search + '%';
    conditions.push({
      _or: [
        {name: {_ilike: pattern}},
        {symbol: {_ilike: pattern}},
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
    default:
      return [{createdAt: 'desc'}];
  }
}

/** Fetch full details for a single token. */
async function fetchTokenDetails(address: string) {
  const data = await graphqlClient.GetTokenByAddress({
    token: address.toLowerCase(),
  });

  const t = data.Launchpad_TokenLaunched[0];
  if (!t) return {error: 'Token not found', address};

  const tokenAddr = t.address as Address;
  const poolPriceData = await getPoolPriceForAgent(tokenAddr);

  return {
    address: t.address,
    name: t.name,
    symbol: t.symbol,
    creator: t.creator,
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
    description: 'Search, filter, and sort projects on the platform. All project tokens are immediately tradable after launch.\n\nExamples:\n- "show me projects" → no filters\n- "find projects with dog in the name" → search: "dog"\n- "projects created by 0xabc..." → creator: "0xabc..."\n- "newest projects" → sortBy: "newest"',
    inputSchema: z.object({
      search: z
        .string()
        .optional()
        .describe(
          'Search query — matches against token name and symbol (case-insensitive)',
        ),
      creator: z
        .string()
        .optional()
        .describe('Filter by creator wallet address (0x...)'),
      createdAfter: z
        .number()
        .optional()
        .describe(
          'Only tokens created after this unix timestamp (seconds)',
        ),
      createdBefore: z
        .number()
        .optional()
        .describe(
          'Only tokens created before this unix timestamp (seconds)',
        ),
      sortBy: z
        .enum([
          'newest',
          'oldest',
          'name_asc',
          'name_desc',
          'symbol_asc',
          'symbol_desc',
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
      creator,
      createdAfter,
      createdBefore,
      sortBy,
      limit,
      offset,
    }) => {
      const effectiveLimit = Math.min(limit, 50);

      const where = buildTokenWhere(
        {search, creator, createdAfter, createdBefore},
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
        creator: t.creator,
        createdAt: t.createdAt,
      }));

      return {
        tokens,
        count: tokens.length,
        offset,
        hasMore: tokens.length === effectiveLimit,
        filters: {
          ...(search && {search}),
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
      'Get full details for a specific project including current pool price and market cap.',
    inputSchema: z.object({
      address: z.string().describe('The token contract address (0x...)'),
    }),
    execute: async ({address}) => {
      return fetchTokenDetails(address);
    },
  }),

  getTokenDetailsBatch: tool({
    description:
      'Get full details for multiple projects in one call. Use this instead of calling getTokenDetails multiple times.',
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
      'Get the current price of any cryptocurrency by name or ticker symbol (e.g. "btc", "ethereum", "sol"). Returns USD price, 24h change, market cap, and volume.',
    inputSchema: z.object({
      coin: z
        .string()
        .describe(
          'Coin name or ticker symbol (e.g. "btc", "bitcoin", "eth", "solana", "doge")',
        ),
    }),
    execute: async ({coin}) => {
      const coinId = resolveCoinId(coin);
      const url = 'https://api.coingecko.com/api/v3/simple/price?ids=' + encodeURIComponent(coinId) + '&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true';

      try {
        const res = await fetch(url);
        if (!res.ok) {
          return {error: 'CoinGecko API error: ' + res.status};
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
            error: 'Coin "' + coin + '" not found. Try using the full name (e.g. "bitcoin") or a common ticker (e.g. "btc").',
          };
        }
        return {
          coin: coinId,
          price: info.usd,
          change24h: info.usd_24h_change
            ? info.usd_24h_change.toFixed(2) + '%'
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
      "Get the connected wallet's token balances for a specific launched token and its quote currency.",
    inputSchema: z.object({
      tokenAddress: z.string().describe('The launched token address (0x...)'),
    }),
  }),

  previewSwap: tool({
    description:
      'Get a swap quote with before/after balances and price impact. ALWAYS call this first before any swap. Supports multi-hop swaps through USDC for non-USDC quote tokens (ETH, USDT, WBTC, DAI).',
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
          'Which quote currency to swap with. Defaults to USDC (single-hop).',
        ),
    }),
  }),

  approveIfNeeded: tool({
    description:
      "Approve token spending for the swap router. Only call this if previewSwap indicated approval is needed.",
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
      "Execute the swap after preview and approval. Only call this AFTER previewSwap (and approveIfNeeded if needed).",
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
      'Get a swap quote when the user specifies an exact OUTPUT amount they want to receive.',
    inputSchema: z.object({
      tokenAddress: z
        .string()
        .describe(
          'The launched token address (0x...) — used to identify the pool',
        ),
      receiveAmount: z
        .string()
        .describe(
          'Exact amount the user wants to receive (in human-readable units)',
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
          'Which quote currency to swap with.',
        ),
    }),
  }),

  executeSwapExactOutput: tool({
    description:
      "Execute an exact output swap after preview and approval.",
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
      'Preview a swap between two well-known tokens (USDC, ETH, USDT, WBTC, DAI) — no launched token needed.',
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
      'Approve token spending for a general swap. Only call if previewGeneralSwap indicated approval is needed.',
    inputSchema: z.object({
      fromToken: z
        .enum(['USDC', 'ETH', 'USDT', 'WBTC', 'DAI'])
        .describe('Token being sold (same as in preview)'),
      sellAmount: z.string().describe('Amount to sell (same as in preview)'),
    }),
  }),

  executeGeneralSwap: tool({
    description:
      'Execute a general swap after preview and approval.',
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
      'Preview a general swap where the user specifies an exact output amount.',
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
          'Exact amount to receive (in human-readable units)',
        ),
    }),
  }),

  executeGeneralSwapExactOutput: tool({
    description:
      'Execute a general exact-output swap after preview and approval.',
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
      'Show 2-3 short clickable reply suggestions so the user can tap instead of typing.',
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
                  'If set, the button is disabled with a countdown timer for this many seconds.',
                ),
            }),
          ]),
        )
        .min(2)
        .max(3)
        .describe(
          'Short reply options (max 4 words each) for the user to pick from.',
        ),
    }),
  }),

};

export const allTools = {...serverTools, ...clientTools};
