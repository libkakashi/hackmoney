import type {Address} from 'viem';
import {useState} from 'react';
import {formatUnits} from 'viem';
import {useTokenByAddress} from '~/hooks/use-tokens';
import {usePoolPrice} from '~/hooks/use-pool-price';
import {useTokenData} from '~/hooks/tokens/use-token-data';
import {usePoolKey} from '~/hooks/swap/use-pool-key';
import {trpc} from '~/lib/trpc';
import {useRepoMetadata} from '~/hooks/use-repo-metadata';
import {Skeleton} from '~/components/ui/skeleton';

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Solidity: '#AA6746',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Dart: '#00B4AB',
  Move: '#4a137a',
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

const Copyable = ({
  text,
  display,
  className,
}: {
  text: string;
  display: string;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className={`hover:text-green transition-colors cursor-pointer ${className ?? ''}`}
    >
      {display}
      {copied && <span className="text-green ml-1 text-xs">copied</span>}
    </button>
  );
};

export const TokenMetadataCard = ({address}: {address?: Address}) => {
  const {data: token} = useTokenByAddress(address);
  const {data: poolKeyData} = usePoolKey(address);
  const poolKey = poolKeyData?.poolKey;
  const {data: poolPrice} = usePoolPrice(address);
  const {data: tokenData} = useTokenData(address);
  const createdAt = token ? new Date(token.createdAt * 1000) : undefined;

  const token0 = poolKey?.currency0;
  const token1 = poolKey?.currency1;

  const {data: {decimals: token0Decimals} = {}} = useTokenData(token0);
  const {data: {decimals: token1Decimals} = {}} = useTokenData(token1);

  const tokenIsToken0 = token0?.toLowerCase() === address?.toLowerCase();
  const quoteDecimals = tokenIsToken0 ? token1Decimals : token0Decimals;
  const tokenDecimals = tokenIsToken0 ? token0Decimals : token1Decimals;

  const normalizedPriceE18 =
    poolPrice?.priceE18 && poolPrice.priceE18 > 0n
      ? tokenIsToken0
        ? poolPrice.priceE18
        : 10n ** 36n / poolPrice.priceE18
      : undefined;

  const price =
    normalizedPriceE18 && quoteDecimals && tokenDecimals
      ? Number(
          formatUnits(normalizedPriceE18, 18 + quoteDecimals - tokenDecimals),
        )
      : undefined;

  const marketCap =
    price && tokenData ? price * Number(tokenData.totalSupply) : undefined;

  const {data: searchResults} = trpc.github.searchRepos.useQuery(
    {query: token?.name ?? ''},
    {enabled: !!token?.name, staleTime: 10 * 60 * 1000, retry: false},
  );
  const repoMatch = searchResults?.[0];
  const {
    details: repo,
    contributors,
    languages,
    lastCommitDate,
  } = useRepoMetadata(repoMatch?.owner, repoMatch?.name);

  if (!address || !token) {
    return (
      <div className="border border-border bg-card">
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="w-12 h-12 shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-px bg-border border-t border-border">
          {Array.from({length: 4}).map((_, i) => (
            <div key={i} className="bg-card px-4 py-3 space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const avatarUrl = repo?.ownerAvatar ?? repoMatch?.ownerAvatar;

  return (
    <div className="border border-border bg-card">
      {/* ── title bar ── */}
      <div className="flex items-center gap-5 px-6 py-5 border-b border-border">
        {/* avatar */}
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={repo?.owner ?? token.name}
            className="w-14 h-14 shrink-0 border border-border"
          />
        )}

        {/* title + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4">
            {repo ? (
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green transition-colors block truncate min-w-0"
              >
                <span className="text-2xl font-semibold">
                  <span className="text-muted-foreground font-normal">
                    {repo.owner}/
                  </span>
                  {repo.name}
                </span>
              </a>
            ) : (
              <span className="text-2xl font-semibold">{token.name}</span>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {repo && (
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="terminal-badge terminal-badge-live"
                >
                  github
                </a>
              )}
              <a
                href={`https://etherscan.io/token/${token.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="terminal-badge terminal-badge-completed"
              >
                etherscan
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1.5">
            <span className="text-green">${token.symbol}</span>
            <Copyable
              text={address}
              display={`${address.slice(0, 6)}...${address.slice(-4)}`}
              className="text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* ── repo metadata ── */}
      {repo && (
        <div className="px-6 py-5 space-y-4">
          {/* description */}
          {repo.description && (
            <p className="text-sm text-foreground/70 leading-relaxed">
              {repo.description}
            </p>
          )}

          {/* stats row */}
          <div className="flex items-center gap-6 text-sm">
            <span>
              <span className="text-yellow tabular-nums">
                {repo.stars.toLocaleString()}
              </span>
              <span className="text-muted-foreground ml-1.5">stars</span>
            </span>
            <span>
              <span className="tabular-nums">
                {repo.forks.toLocaleString()}
              </span>
              <span className="text-muted-foreground ml-1.5">forks</span>
            </span>
            <span>
              <span className="tabular-nums">{repo.openIssues}</span>
              <span className="text-muted-foreground ml-1.5">issues</span>
            </span>
            {repo.license && <span className="text-dim">{repo.license}</span>}
            {lastCommitDate && (
              <span className="text-dim">
                updated {timeAgo(lastCommitDate)}
              </span>
            )}
          </div>

          {/* languages + contributors */}
          {(languages?.length || contributors?.length) && (
            <div className="flex items-center justify-between">
              {languages && languages.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex h-1.5 w-24 overflow-hidden">
                    {languages.map(lang => (
                      <div
                        key={lang.name}
                        style={{
                          width: `${lang.percentage}%`,
                          backgroundColor: LANG_COLORS[lang.name] ?? '#8b8b8b',
                        }}
                        title={`${lang.name} ${lang.percentage}%`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-3">
                    {languages.slice(0, 3).map(lang => (
                      <span
                        key={lang.name}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <span
                          className="w-2 h-2 inline-block"
                          style={{
                            backgroundColor:
                              LANG_COLORS[lang.name] ?? '#8b8b8b',
                          }}
                        />
                        {lang.name}
                      </span>
                    ))}
                    {languages.length > 3 && (
                      <span className="text-xs text-dim/40">
                        +{languages.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {contributors && contributors.length > 0 && (
                <div className="flex -space-x-1.5">
                  {contributors.slice(0, 6).map(c => (
                    <a
                      key={c.login}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={c.login}
                    >
                      <img
                        src={c.avatarUrl}
                        alt={c.login}
                        className="w-5 h-5 border border-background hover:border-green transition-colors"
                      />
                    </a>
                  ))}
                  {contributors.length > 6 && (
                    <span className="w-5 h-5 border border-background bg-background flex items-center justify-center text-[8px] text-dim">
                      +{contributors.length - 6}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* topics */}
          {repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {repo.topics.slice(0, 6).map(topic => (
                <span
                  key={topic}
                  className="text-xs px-2 py-0.5 border border-border text-muted-foreground hover:text-purple hover:border-purple/30 transition-colors"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── on-chain stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-t border-border">
        <div className="bg-card px-5 py-4">
          <div className="text-xs text-muted-foreground mb-1">price</div>
          <div className="text-sm tabular-nums text-green font-medium">
            {price !== undefined ? `$${price.toFixed(4)}` : '--'}
          </div>
        </div>
        <div className="bg-card px-5 py-4">
          <div className="text-xs text-muted-foreground mb-1">market_cap</div>
          <div className="text-sm tabular-nums font-medium">
            {marketCap !== undefined
              ? `$${marketCap.toLocaleString(undefined, {maximumFractionDigits: 0})}`
              : '--'}
          </div>
        </div>
        <div className="bg-card px-5 py-4">
          <div className="text-xs text-muted-foreground mb-1">created</div>
          <div className="text-sm tabular-nums">
            {createdAt
              ? createdAt.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '--'}
          </div>
        </div>
        <div className="bg-card px-5 py-4">
          <div className="text-xs text-muted-foreground mb-1">deployer</div>
          <Copyable
            text={token.creator}
            display={`${token.creator.slice(0, 6)}...${token.creator.slice(-4)}`}
            className="text-sm text-purple"
          />
        </div>
      </div>
    </div>
  );
};
