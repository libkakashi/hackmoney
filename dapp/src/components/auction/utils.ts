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
