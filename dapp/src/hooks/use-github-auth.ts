'use client';

import {useCallback} from 'react';
import {trpc} from '~/lib/trpc';

export function useGithubAuth() {
  const utils = trpc.useUtils();

  const {data: session, isLoading: isLoadingSession} =
    trpc.github.getSession.useQuery(undefined, {
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    });

  const {data: authUrlData} = trpc.github.getAuthUrl.useQuery(undefined, {
    enabled: !session?.isConnected,
  });

  const {mutateAsync: disconnectAsync} = trpc.github.disconnect.useMutation({
    onSuccess: () => {
      void utils.github.getSession.invalidate();
      void utils.github.getRepos.invalidate();
      void utils.github.getOrgs.invalidate();
    },
  });

  const signIn = useCallback(() => {
    if (authUrlData?.url) {
      window.location.href = authUrlData.url;
    }
  }, [authUrlData]);

  const disconnect = useCallback(async () => {
    await disconnectAsync();
  }, [disconnectAsync]);

  return {
    signIn,
    disconnect,
    isConnected: session?.isConnected ?? false,
    username: session?.username ?? null,
    avatarUrl: session?.avatarUrl ?? null,
    isLoading: isLoadingSession,
  };
}
