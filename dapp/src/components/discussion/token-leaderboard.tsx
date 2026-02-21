'use client';

import {useState} from 'react';
import {formatUnits, type Address} from 'viem';
import {TrendingUp, ArrowUpDown} from 'lucide-react';
import {Button} from '~/components/ui/button';
import {cn} from '~/lib/utils';
import {
  useTokenHoldersByBalance,
  useTokenHoldersByVolume,
} from '~/hooks/use-tokens';
import {usePoolPrice} from '~/hooks/use-pool-price';
import {usePoolKey} from '~/hooks/swap/use-pool-key';
import {useTokenData} from '~/hooks/tokens/use-token-data';

type SortMode = 'holders' | 'volume';

const formatAmount = (raw: string | number, decimals: number): string => {
  const n = Number(formatUnits(BigInt(raw), decimals));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
};

const formatUsd = (
  raw: string | number,
  decimals: number,
  priceUsd: number,
): string => {
  const n = Number(formatUnits(BigInt(raw), decimals));
  const usd = n * priceUsd;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(2)}`;
};

const truncateAddress = (addr: string): string => {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// ── Leaderboard row ───────────────────────────────────────────────────────────

const LeaderboardRow = ({
  rank,
  wallet,
  balance,
  totalSent,
  totalReceived,
  mode,
  decimals,
  priceUsd,
}: {
  rank: number;
  wallet: string;
  balance: string;
  totalSent: string;
  totalReceived: string;
  mode: SortMode;
  decimals: number;
  priceUsd: number | undefined;
}) => {
  const volume = BigInt(totalSent) + BigInt(totalReceived);

  return (
    <div className="flex items-center gap-2 py-2 px-2 border-b border-border last:border-b-0 text-sm">
      <span
        className={cn(
          'w-5 text-center tabular-nums',
          rank === 1 && 'text-yellow',
          rank === 2 && 'text-dim',
          rank === 3 && 'text-orange',
          rank > 3 && 'text-dim',
        )}
      >
        {rank}
      </span>

      <div className="flex-1 min-w-0">
        <span className="text-green truncate" title={wallet}>
          {truncateAddress(wallet)}
        </span>
      </div>

      <div className="text-right shrink-0">
        <div className="tabular-nums text-foreground">
          {mode === 'holders'
            ? formatAmount(balance, decimals)
            : formatAmount(volume.toString(), decimals)}
        </div>
        {priceUsd !== undefined && (
          <div className="tabular-nums text-dim">
            {mode === 'holders'
              ? formatUsd(balance, decimals, priceUsd)
              : formatUsd(volume.toString(), decimals, priceUsd)}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main leaderboard component ────────────────────────────────────────────────

export const TokenLeaderboard = ({tokenAddress}: {tokenAddress?: Address}) => {
  const [sortMode, setSortMode] = useState<SortMode>('holders');

  const {data: holdersByBalance, isLoading: loadingBalance} =
    useTokenHoldersByBalance(tokenAddress);
  const {data: holdersByVolume, isLoading: loadingVolume} =
    useTokenHoldersByVolume(tokenAddress);

  const {data: poolPrice} = usePoolPrice(tokenAddress);
  const {data: {poolKey} = {}} = usePoolKey(tokenAddress);
  const {data: tokenData} = useTokenData(tokenAddress);

  const token0 = poolKey?.currency0;
  const token1 = poolKey?.currency1;
  const {data: {decimals: token0Decimals} = {}} = useTokenData(token0);
  const {data: {decimals: token1Decimals} = {}} = useTokenData(token1);

  const tokenIsToken0 = token0?.toLowerCase() === tokenAddress?.toLowerCase();
  const quoteDecimals = tokenIsToken0 ? token1Decimals : token0Decimals;
  const tokenDecimals = tokenIsToken0 ? token0Decimals : token1Decimals;

  const priceUsd =
    poolPrice?.priceE18 &&
    poolPrice.priceE18 > 0n &&
    quoteDecimals !== undefined &&
    tokenDecimals !== undefined
      ? Number(
          formatUnits(
            tokenIsToken0
              ? poolPrice.priceE18
              : 10n ** 36n / poolPrice.priceE18,
            18 + quoteDecimals - tokenDecimals,
          ),
        )
      : undefined;

  const decimals = tokenData?.decimals ?? 18;
  const holders = sortMode === 'holders' ? holdersByBalance : holdersByVolume;
  const isLoading = sortMode === 'holders' ? loadingBalance : loadingVolume;

  return (
    <div className="space-y-3 text-sm h-120 flex flex-col">
      {/* Sort tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        <Button
          variant="ghost"
          onClick={() => setSortMode('holders')}
          className={cn(
            sortMode === 'holders'
              ? 'text-green'
              : 'text-dim hover:text-foreground',
          )}
        >
          <TrendingUp className="size-3" />
          top_holders
        </Button>
        <Button
          variant="ghost"
          onClick={() => setSortMode('volume')}
          className={cn(
            sortMode === 'volume'
              ? 'text-green'
              : 'text-dim hover:text-foreground',
          )}
        >
          <ArrowUpDown className="size-3" />
          top_volume
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-dim text-center py-4">loading...</div>
        ) : holders && holders.length > 0 ? (
          holders.map((holder, i) => (
            <LeaderboardRow
              key={holder.id}
              rank={i + 1}
              wallet={holder.wallet}
              balance={holder.balance}
              totalSent={holder.totalSent}
              totalReceived={holder.totalReceived}
              mode={sortMode}
              decimals={decimals}
              priceUsd={priceUsd}
            />
          ))
        ) : (
          <div className="text-dim text-center py-4">// no holder data yet</div>
        )}
      </div>

      {/* Footer */}
      {holders && holders.length > 0 && (
        <div className="text-dim text-center py-1 text-xs">
          // {holders.length} entries
        </div>
      )}
    </div>
  );
};
