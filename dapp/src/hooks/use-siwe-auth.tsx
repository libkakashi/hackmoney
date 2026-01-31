'use client';

import {useCallback, useEffect, useState} from 'react';
import {useChainId, useSignMessage, useConnection} from 'wagmi';
import {trpc} from '~/lib/trpc';
import {createMessage} from '~/lib/auth/siwe';

export function useSiweAuth() {
  const chainId = useChainId();
  const {address, isConnected} = useConnection();
  const {mutateAsync: signMessageAsync} = useSignMessage();

  const utils = trpc.useUtils();

  const {data: session, refetch: refetchSession} =
    trpc.auth.getSession.useQuery(undefined, {
      refetchOnMount: 'always',
      refetchOnWindowFocus: true,
    });

  const {mutateAsync: getNonceAsync} = trpc.auth.getNonce.useMutation();
  const {mutateAsync: verifyAsync} = trpc.auth.verify.useMutation({
    onSuccess: () => {
      utils.auth.getSession.invalidate();
    },
  });
  const {mutateAsync: logoutAsync} = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.getSession.invalidate();
    },
  });

  const [isSigning, setIsSigning] = useState(false);

  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsSigning(true);
    try {
      const {nonce} = await getNonceAsync();

      const message = createMessage({
        address,
        nonce,
        chainId,
        domain: window.location.host,
        uri: window.location.origin,
      });

      const signature = await signMessageAsync({message});

      await verifyAsync({message, signature});
      await refetchSession();
    } finally {
      setIsSigning(false);
    }
  }, [
    address,
    chainId,
    isConnected,
    getNonceAsync,
    signMessageAsync,
    verifyAsync,
    refetchSession,
  ]);

  const signOut = useCallback(async () => {
    await logoutAsync();
    await refetchSession();
  }, [logoutAsync, refetchSession]);

  // Check session validity - if session address doesn't match
  // connected wallet, user needs to re-authenticate
  const isAuthenticated =
    session?.isLoggedIn &&
    session?.address?.toLowerCase() === address?.toLowerCase();

  // User is connected but needs to sign in (session expired or address mismatch)
  const needsSignIn = isConnected && address && session && !isAuthenticated;

  // Logout from session when wallet disconnects
  useEffect(() => {
    if (!isConnected && session?.isLoggedIn) {
      void logoutAsync();
      refetchSession();
    }
  }, [isConnected, session?.isLoggedIn, logoutAsync, refetchSession]);

  return {
    signIn,
    signOut,
    isSigning,
    isAuthenticated: isAuthenticated ?? false,
    needsSignIn: needsSignIn ?? false,
    session,
  };
}
