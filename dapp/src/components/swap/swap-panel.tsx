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
    <div className="border border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-green">$</span>
          <span className="text-sm">swap</span>
        </div>
        <p className="text-xs text-dim mt-1">
          trade {token?.symbol || 'tokens'} on uniswap v4
        </p>
      </div>
      <div className="p-4">
        <SwapCard poolKey={poolKey} tokenAddr={tokenAddr} />
      </div>
    </div>
  );
};
