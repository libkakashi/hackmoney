'use client';

import type {Address} from 'viem';
import {trpc} from '~/lib/trpc';
import {useTokenByAddress} from '~/hooks/use-tokens';

export const useTokenRepo = (tokenAddress?: Address) => {
  const {data: token} = useTokenByAddress(tokenAddress);

  const {data: searchResults, isLoading} = trpc.github.searchRepos.useQuery(
    {query: token?.name ?? ''},
    {enabled: !!token?.name, staleTime: 10 * 60 * 1000, retry: false},
  );

  const repo = searchResults?.[0];

  return {
    owner: repo?.owner ?? null,
    name: repo?.name ?? null,
    fullName: repo?.fullName ?? null,
    isLoading,
    isResolved: !!repo,
  };
};
