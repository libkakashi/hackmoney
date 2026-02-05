import type {Address} from 'viem';
import {tool} from 'ai';
import {z} from 'zod';
import {graphqlClient} from '~/graphql/client';
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

/** Server-side tools — have execute handlers that run on the server */
export const serverTools = {
  searchTokens: tool({
    description:
      'Search for tokens by name or symbol. Returns a list of matching tokens with their current phase.',
    inputSchema: z.object({
      query: z
        .string()
        .describe('Search query to match against token name or symbol'),
      limit: z.number().optional().default(5).describe('Max number of results'),
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
      offset: z.number().optional().default(0).describe('Pagination offset'),
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

  executeSwap: tool({
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

  suggestReplies: tool({
    description:
      'Show 2-3 short clickable reply suggestions (max 4 words each) so the user can tap instead of typing. Use this whenever you ask the user a question or present a choice. Examples: after a swap preview use ["yes, do it", "no, cancel"]; after showing token info use ["bid on it", "show more"]; when asking which token use the token symbols as options.',
    inputSchema: z.object({
      replies: z
        .array(z.string())
        .min(2)
        .max(3)
        .describe(
          'Short reply options (max 4 words each) for the user to pick from',
        ),
    }),
  }),
};

export const allTools = {...serverTools, ...clientTools};
