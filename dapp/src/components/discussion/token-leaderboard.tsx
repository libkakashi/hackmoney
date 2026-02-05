'use client';

import {useState} from 'react';
import {TrendingUp, ArrowUpDown} from 'lucide-react';
import {Button} from '~/components/ui/button';
import {Badge} from '~/components/ui/badge';
import {cn} from '~/lib/utils';

// ── Placeholder data ──────────────────────────────────────────────────────────

type LeaderboardEntry = {
  rank: number;
  address: string;
  displayName?: string;
  holdingAmount: string;
  holdingUsd: string;
  tradingVolume: string;
  volumeUsd: string;
  flair?: string;
};

const PLACEHOLDER_HOLDERS: LeaderboardEntry[] = [
  {
    rank: 1,
    address: '0x1234...abcd',
    displayName: 'whale_watcher',
    holdingAmount: '2.5M',
    holdingUsd: '$12,500',
    tradingVolume: '890K',
    volumeUsd: '$4,450',
    flair: 'whale',
  },
  {
    rank: 2,
    address: '0x5678...ef01',
    displayName: 'defi_maxi',
    holdingAmount: '1.8M',
    holdingUsd: '$9,000',
    tradingVolume: '1.2M',
    volumeUsd: '$6,000',
    flair: 'OG bidder',
  },
  {
    rank: 3,
    address: '0x9abc...2345',
    holdingAmount: '950K',
    holdingUsd: '$4,750',
    tradingVolume: '420K',
    volumeUsd: '$2,100',
  },
  {
    rank: 4,
    address: '0xdef0...6789',
    displayName: 'anon_trader',
    holdingAmount: '720K',
    holdingUsd: '$3,600',
    tradingVolume: '2.1M',
    volumeUsd: '$10,500',
  },
  {
    rank: 5,
    address: '0xaaaa...bbbb',
    holdingAmount: '500K',
    holdingUsd: '$2,500',
    tradingVolume: '180K',
    volumeUsd: '$900',
  },
  {
    rank: 6,
    address: '0xcccc...dddd',
    displayName: 'data_nerd',
    holdingAmount: '340K',
    holdingUsd: '$1,700',
    tradingVolume: '560K',
    volumeUsd: '$2,800',
    flair: 'analyst',
  },
  {
    rank: 7,
    address: '0xeeee...ffff',
    holdingAmount: '210K',
    holdingUsd: '$1,050',
    tradingVolume: '90K',
    volumeUsd: '$450',
  },
  {
    rank: 8,
    address: '0x1111...2222',
    holdingAmount: '180K',
    holdingUsd: '$900',
    tradingVolume: '45K',
    volumeUsd: '$225',
  },
];

type SortMode = 'holders' | 'volume';

// ── Leaderboard row ───────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  mode,
}: {
  entry: LeaderboardEntry;
  mode: SortMode;
}) {
  return (
    <div className="flex items-center gap-2 py-2 px-2 border-b border-border last:border-b-0 text-sm">
      <span
        className={cn(
          'w-5 text-center tabular-nums',
          entry.rank === 1 && 'text-yellow',
          entry.rank === 2 && 'text-dim',
          entry.rank === 3 && 'text-orange',
          entry.rank > 3 && 'text-dim',
        )}
      >
        {entry.rank}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-green truncate">
            {entry.displayName || entry.address}
          </span>
          {entry.flair && (
            <Badge
              variant={
                entry.flair === 'whale'
                  ? 'warning'
                  : entry.flair === 'analyst'
                    ? 'purple'
                    : 'default'
              }
              className="px-1 py-0 shrink-0"
            >
              {entry.flair}
            </Badge>
          )}
        </div>
        <span className="text-dim">
          {entry.displayName ? entry.address : '\u00A0'}
        </span>
      </div>

      <div className="text-right shrink-0">
        <div className="tabular-nums text-foreground">
          {mode === 'holders' ? entry.holdingAmount : entry.tradingVolume}
        </div>
        <div className="tabular-nums text-dim">
          {mode === 'holders' ? entry.holdingUsd : entry.volumeUsd}
        </div>
      </div>
    </div>
  );
}

// ── Main leaderboard component ────────────────────────────────────────────────

export function TokenLeaderboard() {
  const [sortMode, setSortMode] = useState<SortMode>('holders');

  const sorted = [...PLACEHOLDER_HOLDERS].sort((a, b) => {
    // Placeholder sort — already sorted by rank for holders
    if (sortMode === 'volume') {
      const parseAmount = (s: string) => {
        const num = parseFloat(s);
        if (s.endsWith('M')) return num * 1_000_000;
        if (s.endsWith('K')) return num * 1_000;
        return num;
      };
      return parseAmount(b.tradingVolume) - parseAmount(a.tradingVolume);
    }
    return a.rank - b.rank;
  });

  return (
    <div className="space-y-3 text-sm">
      {/* Sort tabs as header */}
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
      <div>
        {sorted.map(entry => (
          <LeaderboardRow key={entry.address} entry={entry} mode={sortMode} />
        ))}
      </div>

      {/* Footer */}
      <div className="text-dim text-center py-1">
        // placeholder data · {PLACEHOLDER_HOLDERS.length} entries
      </div>
    </div>
  );
}
