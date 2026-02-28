'use client';

import type {Address} from 'viem';
import {SwapCard} from './swap-card';
import {usePoolKey} from '~/hooks/swap/use-pool-key';
import {useTokenByAddress} from '~/hooks/use-tokens';

export const SwapPanel = ({tokenAddr}: {tokenAddr?: Address}) => {
  const {data: token} = useTokenByAddress(tokenAddr);
  const {data: {poolKey, isMigrated} = {}} = usePoolKey(token?.address);

  if (!poolKey || !isMigrated) return null;

  return (
    <div className="border border-border bg-card p-4 pt-2">
      <SwapCard poolKey={poolKey} tokenAddr={tokenAddr} />
    </div>
  );
};
