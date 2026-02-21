'use client';

import type {Address} from 'viem';
import {useState, useEffect, useMemo} from 'react';
import {useInView} from 'react-intersection-observer';
import {useBlockNumber} from 'wagmi';
import Link from 'next/link';
import {Loader2} from 'lucide-react';
import {
  DiscoverTokenCard,
  DiscoverTokenCardSkeleton,
} from './discover-token-card';
import {Container} from '~/components/layout/container';
import {Button} from '~/components/ui/button';
import {Input} from '~/components/ui/input';
import {useInfiniteTokens} from '~/hooks/use-tokens';

import type {GetTokensQuery} from '~/graphql/generated';

type Token = GetTokensQuery['Launchpad_TokenLaunched'][number];
type AuctionPhase = 'all' | 'live' | 'upcoming' | 'trading';
type SortBy = 'newest' | 'oldest';

interface TokenFilters {
  search: string;
  sortBy: SortBy;
  phase: AuctionPhase;
}

const FILTERS = [
  {id: 'all', label: 'all'},
  {id: 'live', label: 'live'},
  {id: 'upcoming', label: 'upcoming'},
  {id: 'trading', label: 'trading'},
] as const;

function getTokenPhase(
  token: Token,
  currentBlock: bigint,
): 'upcoming' | 'live' | 'ended' | 'claimable' | 'trading' {
  const startBlock = BigInt(token.auctionStartBlock);
  const endBlock = BigInt(token.auctionEndBlock);
  const claimBlock = BigInt(token.auctionClaimBlock);
  const migrationBlock = BigInt(token.poolMigrationBlock);

  if (currentBlock < startBlock) return 'upcoming';
  if (currentBlock >= startBlock && currentBlock < endBlock) return 'live';
  if (currentBlock >= endBlock && currentBlock < claimBlock) return 'ended';
  if (currentBlock >= claimBlock && currentBlock < migrationBlock)
    return 'claimable';
  return 'trading';
}

export default function DiscoverPage() {
  const {ref, inView} = useInView();
  const {data: currentBlock = 0n} = useBlockNumber({watch: true});

  const [filters, setFilters] = useState<TokenFilters>({
    search: '',
    sortBy: 'newest',
    phase: 'all',
  });
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteTokens();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const tokens =
    data?.pages.flatMap(page => page.Launchpad_TokenLaunched) ?? [];

  // Filter and sort tokens
  const filteredTokens = useMemo(() => {
    return tokens
      .filter(token => {
        // Search filter
        if (filters.search) {
          const search = filters.search.toLowerCase();
          if (
            !token.name.toLowerCase().includes(search) &&
            !token.symbol.toLowerCase().includes(search)
          ) {
            return false;
          }
        }
        // Phase filter
        if (filters.phase !== 'all') {
          const phase = getTokenPhase(token, currentBlock);
          if (filters.phase === 'live' && phase !== 'live') return false;
          if (filters.phase === 'upcoming' && phase !== 'upcoming')
            return false;
          if (filters.phase === 'trading' && phase !== 'trading') return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'newest') {
          return b.createdAt - a.createdAt;
        }
        return a.createdAt - b.createdAt;
      });
  }, [tokens, filters, currentBlock]);

  // Calculate phase counts
  const phaseCounts = useMemo(() => {
    return {
      all: tokens.length,
      live: tokens.filter(t => getTokenPhase(t, currentBlock) === 'live')
        .length,
      upcoming: tokens.filter(
        t => getTokenPhase(t, currentBlock) === 'upcoming',
      ).length,
      trading: tokens.filter(t => getTokenPhase(t, currentBlock) === 'trading')
        .length,
    };
  }, [tokens, currentBlock]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border">
        <Container size="xl">
          <div className="py-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-dim text-sm mb-2">
                  ~/nyx <span className="text-green">$</span> ls projects/
                </div>
                <h1 className="text-2xl font-bold">discover projects</h1>
              </div>
              <Button asChild>
                <Link href="/launch">launch project</Link>
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(filter => {
                const count =
                  phaseCounts[filter.id as keyof typeof phaseCounts];
                const isActive = filters.phase === filter.id;
                return (
                  <Button
                    key={filter.id}
                    variant={isActive ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() =>
                      setFilters(prev => ({
                        ...prev,
                        phase: filter.id as AuctionPhase,
                      }))
                    }
                    className={isActive ? 'bg-green/10' : ''}
                  >
                    {filter.id === 'live' && isActive && (
                      <span className="inline-block w-1.5 h-1.5 bg-green mr-2 pulse-soft" />
                    )}
                    {filter.label}
                    <span className="ml-2 text-xs">{count}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </Container>
      </div>

      <Container size="xl">
        <div className="py-8">
          {/* Search & sort */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Input
              type="text"
              placeholder="search..."
              value={filters.search}
              onChange={e =>
                setFilters(prev => ({...prev, search: e.target.value}))
              }
              className="flex-1 h-10 px-4 bg-card"
            />
            <select
              value={filters.sortBy}
              onChange={e =>
                setFilters(prev => ({
                  ...prev,
                  sortBy: e.target.value as SortBy,
                }))
              }
              className="h-10 px-4 bg-card border border-border text-sm focus:outline-none focus:border-green cursor-pointer"
            >
              <option value="newest">newest</option>
              <option value="oldest">oldest</option>
            </select>
          </div>

          {/* Results count */}
          <div className="text-dim text-sm mb-4">
            {filteredTokens.length} projects
            {filters.search && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setFilters(prev => ({...prev, search: ''}))}
                className="ml-4"
              >
                clear
              </Button>
            )}
          </div>

          {/* Error state */}
          {isError && (
            <div className="border border-border bg-card p-6 text-center mb-6">
              <div className="text-red mb-2">
                error: {error?.message || 'failed to load projects'}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.location.reload()}
              >
                retry
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <DiscoverTokenCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {/* Token grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTokens.map(token => (
                  <DiscoverTokenCard
                    key={token.id}
                    tokenAddr={token.address as Address}
                  />
                ))}
              </div>

              {/* Infinite scroll trigger */}
              <div ref={ref} className="mt-8 flex justify-center">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-dim">
                    <Loader2 className="size-4 animate-spin" />
                    <span>loading...</span>
                  </div>
                )}
                {!hasNextPage &&
                  tokens.length > 0 &&
                  filteredTokens.length > 0 && (
                    <p className="text-dim">~ end of results ~</p>
                  )}
              </div>
            </>
          )}

          {/* Empty state */}
          {!isLoading && filteredTokens.length === 0 && !isError && (
            <div className="border border-border bg-card p-12 text-center">
              {tokens.length === 0 ? (
                <>
                  <div className="text-dim mb-2">no projects launched yet</div>
                  <div className="text-dim text-sm mb-4">
                    be the first to launch an open source project token
                  </div>
                  <Button asChild>
                    <Link href="/launch">launch project</Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-dim mb-2">no projects found</div>
                  <div className="text-dim text-sm">
                    try adjusting your filters
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
