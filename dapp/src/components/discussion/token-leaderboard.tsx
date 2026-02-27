'use client';

import {useState} from 'react';
import {formatUnits, type Address} from 'viem';
import {TrendingUp, GitFork} from 'lucide-react';
import {Button} from '~/components/ui/button';
import {cn} from '~/lib/utils';
import {useTokenByAddress, useTokenHoldersByBalance} from '~/hooks/use-tokens';
import {usePoolPrice} from '~/hooks/use-pool-price';
import {usePoolKey} from '~/hooks/swap/use-pool-key';
import {useTokenData} from '~/hooks/tokens/use-token-data';
import {trpc} from '~/lib/trpc';

type Tab = 'holders' | 'contributors';

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

// ── Holder row ────────────────────────────────────────────────────────────────

const HolderRow = ({
  rank,
  wallet,
  balance,
  decimals,
  priceUsd,
}: {
  rank: number;
  wallet: string;
  balance: string;
  decimals: number;
  priceUsd: number | undefined;
}) => (
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
        {formatAmount(balance, decimals)}
      </div>
      {priceUsd !== undefined && (
        <div className="tabular-nums text-dim">
          {formatUsd(balance, decimals, priceUsd)}
        </div>
      )}
    </div>
  </div>
);

// ── Contributor row ───────────────────────────────────────────────────────────

const ContributorRow = ({
  rank,
  login,
  avatarUrl,
  url,
  contributions,
}: {
  rank: number;
  login: string;
  avatarUrl: string;
  url: string;
  contributions: number;
}) => (
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
    <img
      src={avatarUrl}
      alt={login}
      className="w-5 h-5 border border-border shrink-0"
    />
    <div className="flex-1 min-w-0">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-green truncate hover:text-foreground transition-colors"
        title={login}
      >
        {login}
      </a>
    </div>
    <div className="text-right shrink-0 tabular-nums">
      <span className="text-foreground">{contributions.toLocaleString()}</span>
      <span className="text-dim ml-1">commits</span>
    </div>
  </div>
);

// ── Main leaderboard component ────────────────────────────────────────────────

export const TokenLeaderboard = ({tokenAddress}: {tokenAddress?: Address}) => {
  const [tab, setTab] = useState<Tab>('holders');

  const {data: token} = useTokenByAddress(tokenAddress);

  const {data: holdersByBalance, isLoading: loadingHolders} =
    useTokenHoldersByBalance(tokenAddress);

  // resolve repo from token name
  const {data: searchResults} = trpc.github.searchRepos.useQuery(
    {query: token?.name ?? ''},
    {enabled: !!token?.name, staleTime: 10 * 60 * 1000, retry: false},
  );
  const repoMatch = searchResults?.[0];

  const {data: contributors, isLoading: loadingContributors} =
    trpc.github.getContributors.useQuery(
      {owner: repoMatch?.owner ?? '', repo: repoMatch?.name ?? ''},
      {
        enabled: !!repoMatch?.owner && !!repoMatch?.name,
        staleTime: 5 * 60 * 1000,
        retry: false,
      },
    );

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
  const isLoading = tab === 'holders' ? loadingHolders : loadingContributors;

  return (
    <div className="space-y-3 text-sm h-120 flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        <Button
          variant="ghost"
          onClick={() => setTab('holders')}
          className={cn(
            tab === 'holders' ? 'text-green' : 'text-dim hover:text-foreground',
          )}
        >
          <TrendingUp className="size-3" />
          top_holders
        </Button>
        <Button
          variant="ghost"
          onClick={() => setTab('contributors')}
          className={cn(
            tab === 'contributors'
              ? 'text-green'
              : 'text-dim hover:text-foreground',
          )}
        >
          <GitFork className="size-3" />
          top_contributors
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-dim text-center py-4">loading...</div>
        ) : tab === 'holders' ? (
          holdersByBalance && holdersByBalance.length > 0 ? (
            holdersByBalance.map((holder, i) => (
              <HolderRow
                key={holder.id}
                rank={i + 1}
                wallet={holder.wallet}
                balance={holder.balance}
                decimals={decimals}
                priceUsd={priceUsd}
              />
            ))
          ) : (
            <div className="text-dim text-center py-4">
              // no holder data yet
            </div>
          )
        ) : contributors && contributors.length > 0 ? (
          contributors.map((c, i) => (
            <ContributorRow
              key={c.login}
              rank={i + 1}
              login={c.login}
              avatarUrl={c.avatarUrl}
              url={c.url}
              contributions={c.contributions}
            />
          ))
        ) : (
          <div className="text-dim text-center py-4">
            {repoMatch
              ? '// no contributor data yet'
              : '// no linked repository'}
          </div>
        )}
      </div>

      {/* Footer */}
      {tab === 'holders' && holdersByBalance && holdersByBalance.length > 0 && (
        <div className="text-dim text-center py-1 text-xs">
          // {holdersByBalance.length} entries
        </div>
      )}
      {tab === 'contributors' && contributors && contributors.length > 0 && (
        <div className="text-dim text-center py-1 text-xs">
          // {contributors.length} contributors
        </div>
      )}
    </div>
  );
};
