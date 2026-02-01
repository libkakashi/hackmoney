'use client';

import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {getGraphqlClient} from '~/graphql/client';
import {env} from '~/lib/env';

const client = getGraphqlClient(env.graphqlUrl);

export const TOKENS_PAGE_SIZE = 12;

export function useTokens(limit = TOKENS_PAGE_SIZE, offset = 0) {
  return useQuery({
    queryKey: ['tokens', limit, offset],
    queryFn: () => client.GetTokens({limit, offset}),
  });
}

export function useInfiniteTokens(pageSize = TOKENS_PAGE_SIZE) {
  return useInfiniteQuery({
    queryKey: ['tokens', 'infinite', pageSize],
    queryFn: ({pageParam = 0}) =>
      client.GetTokens({limit: pageSize, offset: pageParam}),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const tokens = lastPage.Launchpad_TokenLaunched;
      if (tokens.length < pageSize) {
        return undefined;
      }
      return allPages.length * pageSize;
    },
  });
}

export function useTokenByAddress(token: string) {
  return useQuery({
    queryKey: ['token', token],
    queryFn: () => client.GetTokenByAddress({token}),
    enabled: !!token,
  });
}
