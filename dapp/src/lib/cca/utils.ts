export const CCA_CONSTANTS = {
  /** MPS = 1e7 = 100% of token supply in millionths */
  MPS: 10_000_000n,
  /** Q96 = 2^96 for fixed-point arithmetic */
  Q96: 2n ** 96n,
  /** Maximum total supply supported: 2^100 (about 1 trillion with 18 decimals) */
  MAX_TOTAL_SUPPLY: 2n ** 100n,
  /** Minimum floor price: type(uint32).max + 1 */
  MIN_FLOOR_PRICE: 2n ** 32n,
  /** Minimum tick spacing */
  MIN_TICK_SPACING: 2n,
  /** Maximum token split (100% in mps) */
  MAX_TOKEN_SPLIT: 10_000_000,
} as const;

// =============================================================================
// PRICE CONVERSION UTILITIES
// =============================================================================

/**
 * Q96 constant: 2^96
 */
export const Q96 = CCA_CONSTANTS.Q96;

/**
 * Convert a human-readable price to Q96 format
 *
 * Formula: priceQ96 = (priceHuman * 10^quoteDecimals * 2^96) / 10^tokenDecimals
 *
 * @param priceUsd - Price in USD (e.g., 0.10 for $0.10)
 * @param quoteDecimals - Decimals of quote currency (6 for USDC, 18 for ETH)
 * @param tokenDecimals - Decimals of the token being sold (typically 18)
 * @returns Price in Q96 format
 *
 * @example
 * // $0.10 per token with USDC (6 decimals) quote and 18 decimal token
 * const priceQ96 = usdToPriceQ96(0.10, 6, 18);
 */
export function usdToPriceQ96(
  priceUsd: number,
  quoteDecimals: number,
  tokenDecimals: number,
): bigint {
  // price in smallest quote units per 1 full token
  // priceQ96 = (priceUsd * 10^quoteDecimals) * Q96 / 10^tokenDecimals
  const priceInQuoteUnits = BigInt(Math.floor(priceUsd * 10 ** quoteDecimals));
  // Scale by Q96 and adjust for token decimals
  return (priceInQuoteUnits * Q96) / BigInt(10 ** tokenDecimals);
}

/**
 * Convert a Q96 price back to human-readable USD
 *
 * @param priceQ96 - Price in Q96 format
 * @param quoteDecimals - Decimals of quote currency
 * @param tokenDecimals - Decimals of the token
 * @returns Price in USD
 */
export function priceQ96ToUsd(
  priceQ96: bigint,
  quoteDecimals: number,
  tokenDecimals: number,
): number {
  // Reverse the conversion
  const priceInQuoteUnits = (priceQ96 * BigInt(10 ** tokenDecimals)) / Q96;
  return Number(priceInQuoteUnits) / 10 ** quoteDecimals;
}

/**
 * Calculate tick spacing based on floor price and desired granularity
 *
 * @param floorPriceQ96 - Floor price in Q96 format
 * @param granularityPercent - Desired price step as percentage of floor (e.g., 1 for 1%)
 * @returns Tick spacing in Q96 format
 */
export function calculateTickSpacing(
  floorPriceQ96: bigint,
  granularityPercent: number = 1,
): bigint {
  // tickSpacing = floorPrice * granularityPercent / 100
  const spacing =
    (floorPriceQ96 * BigInt(Math.floor(granularityPercent * 100))) / 10000n;
  // Ensure minimum tick spacing of 2
  return spacing < CCA_CONSTANTS.MIN_TICK_SPACING
    ? CCA_CONSTANTS.MIN_TICK_SPACING
    : spacing;
}

/**
 * Round a price to the nearest valid tick boundary
 *
 * The CCA contract requires prices to be aligned to tick boundaries.
 * This function rounds DOWN to the nearest valid tick to ensure the
 * maxPrice doesn't exceed what the user specified.
 *
 * @param priceQ96 - Price in Q96 format
 * @param tickSpacingQ96 - Tick spacing in Q96 format
 * @param floorPriceQ96 - Floor price in Q96 format
 * @returns Price rounded down to nearest tick boundary
 */
export function roundPriceToTick(
  priceQ96: bigint,
  tickSpacingQ96: bigint,
  floorPriceQ96: bigint,
): bigint {
  if (tickSpacingQ96 === 0n) {
    throw new Error('Tick spacing cannot be zero');
  }

  // If price is at or below floor, return floor price
  if (priceQ96 <= floorPriceQ96) {
    return floorPriceQ96;
  }

  // Calculate the offset from floor price
  const offset = priceQ96 - floorPriceQ96;

  // Round down to nearest tick
  const ticksFromFloor = offset / tickSpacingQ96;
  const roundedOffset = ticksFromFloor * tickSpacingQ96;

  return floorPriceQ96 + roundedOffset;
}
