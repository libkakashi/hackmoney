'use client';

import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {Address} from 'viem';
import {graphqlClient} from '~/graphql/client';

export const TOKENS_PAGE_SIZE = 12;

export const useTokens = (limit = TOKENS_PAGE_SIZE, offset = 0) => {
  return useQuery({
    queryKey: ['tokens', limit, offset],
    queryFn: () => graphqlClient.GetTokens({limit, offset}),
  });
};

export const useInfiniteTokens = (pageSize = TOKENS_PAGE_SIZE) => {
  return useInfiniteQuery({
    queryKey: ['tokens', 'infinite', pageSize],
    queryFn: ({pageParam = 0}) =>
      graphqlClient.GetTokens({limit: pageSize, offset: pageParam}),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const tokens = lastPage.Launchpad_TokenLaunched;

      if (tokens.length < pageSize) {
        return undefined;
      }
      return allPages.length * pageSize;
    },
  });
};

export const useTokenByAddress = (token?: string) => {
  return useQuery({
    queryKey: ['token', token],
    enabled: !!token,

    queryFn: () =>
      token
        ? graphqlClient.GetTokenByAddress({token: token.toLowerCase()})
        : undefined,
    select: data =>
      data
        ? {
            ...data.Launchpad_TokenLaunched[0],
            address: data.Launchpad_TokenLaunched[0].address as Address,
            auction: data.Launchpad_TokenLaunched[0].auction as Address,
            strategy: data.Launchpad_TokenLaunched[0].strategy as Address,
          }
        : undefined,
  });
};
