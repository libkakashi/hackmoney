import type {Address} from 'viem';

/**
 * Quote tokens available for swapping against launchpad tokens.
 * The launchpad pool is always token/USDC. For non-USDC quote tokens,
 * we route through USDC as an intermediate hop:
 *   token -> USDC -> targetQuoteToken (or reverse)
 */

export const USDC_ADDRESS =
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const satisfies Address;

export interface QuoteToken {
  address: Address;
  symbol: string;
  decimals: number;
  /** If undefined, this is USDC itself (single-hop). Otherwise, the USDC-paired pool used for the second hop. */
  intermediatePool?: {
    fee: number;
    tickSpacing: number;
    hooks: Address;
  };
}

const ZERO_HOOKS =
  '0x0000000000000000000000000000000000000000' as const satisfies Address;

export const QUOTE_TOKENS: QuoteToken[] = [
  {
    address: USDC_ADDRESS,
    symbol: 'USDC',
    decimals: 6,
    // No intermediate pool needed - direct swap via launchpad pool
  },
  {
    // Native ETH is address(0) in Uniswap V4
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    intermediatePool: {
      // ETH/USDC 0.05% pool (confirmed on mainnet)
      fee: 500,
      tickSpacing: 10,
      hooks: ZERO_HOOKS,
    },
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    decimals: 6,
    intermediatePool: {
      // USDC/USDT 0.01% stablecoin pool
      fee: 100,
      tickSpacing: 1,
      hooks: ZERO_HOOKS,
    },
  },
  {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    symbol: 'WBTC',
    decimals: 8,
    intermediatePool: {
      // WBTC/USDC 0.30% pool (confirmed on mainnet)
      fee: 3000,
      tickSpacing: 60,
      hooks: ZERO_HOOKS,
    },
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    decimals: 18,
    intermediatePool: {
      // DAI/USDC 0.01% stablecoin pool
      fee: 100,
      tickSpacing: 1,
      hooks: ZERO_HOOKS,
    },
  },
];

export const getQuoteToken = (address: Address): QuoteToken | undefined =>
  QUOTE_TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());

export const getQuoteTokenBySymbol = (symbol: string): QuoteToken => {
  const qt = QUOTE_TOKENS.find(
    t => t.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (!qt) throw new Error(`Unknown quote token: ${symbol}`);
  return qt;
};

export const isDirectSwap = (quoteToken: QuoteToken): boolean =>
  !quoteToken.intermediatePool;

/**
 * Build a Uniswap V4 PoolKey for a quote token's USDC-paired pool.
 * Sorts currency0 < currency1 as required by V4.
 */
export function buildQuotePoolKey(quoteToken: QuoteToken): {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
} {
  if (!quoteToken.intermediatePool) {
    throw new Error(`${quoteToken.symbol} is USDC — no intermediate pool`);
  }
  const ip = quoteToken.intermediatePool;
  const a = USDC_ADDRESS.toLowerCase();
  const b = quoteToken.address.toLowerCase();
  const [currency0, currency1] =
    a < b
      ? [USDC_ADDRESS, quoteToken.address]
      : [quoteToken.address, USDC_ADDRESS];
  return {
    currency0,
    currency1,
    fee: ip.fee,
    tickSpacing: ip.tickSpacing,
    hooks: ip.hooks,
  };
}
