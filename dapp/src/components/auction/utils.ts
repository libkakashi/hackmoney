import {formatUnits} from 'viem';

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(num >= 10_000_000_000 ? 0 : 1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(num >= 10_000 ? 0 : 1) + 'K';
  }
  return num.toLocaleString(undefined, {maximumFractionDigits: 0});
}

export function formatAmount(amount: bigint, decimals = 6): string {
  const num = Number(formatUnits(amount, decimals));
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
}
