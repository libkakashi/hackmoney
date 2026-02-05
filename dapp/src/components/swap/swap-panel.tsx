'use client';

import type {Address} from 'viem';
import {useBlock} from 'wagmi';
import {SwapCard} from './swap-card';
import {usePoolKey} from '~/hooks/swap/use-pool-key';
import {useEnsureMigration} from '~/hooks/use-ensure-migration';
import {useTokenByAddress} from '~/hooks/use-tokens';
import {useAuctionState} from '~/hooks/cca/use-auction-state';
import {Button} from '~/components/ui/button';
import {Loader} from '~/components/ui/loader';

export const SwapPanel = ({tokenAddr}: {tokenAddr?: Address}) => {
  const {data: token} = useTokenByAddress(tokenAddr);
  const {data: {poolKey, isMigrated} = {}} = usePoolKey(token?.address);
  const {data: auctionState} = useAuctionState(token?.auction);
  const {data: currentBlock} = useBlock({watch: true});

  const {mutateAsync: ensureMigration, isPending: isMigrating} =
    useEnsureMigration(tokenAddr);

  const handleInitializePool = async () => {
    if (!token) return;
    await ensureMigration();
  };

  const showSwapPanel =
    auctionState &&
    (auctionState.status === 'ended' || auctionState.status === 'claimable');

  if (!showSwapPanel) return null;

  const migrationBlock = token?.poolMigrationBlock
    ? BigInt(token.poolMigrationBlock)
    : undefined;
  const currentBlockNumber = currentBlock?.number;

  const canMigrate =
    migrationBlock && currentBlockNumber
      ? currentBlockNumber >= migrationBlock
      : false;
  const blocksUntilMigration =
    migrationBlock && currentBlockNumber && currentBlockNumber < migrationBlock
      ? migrationBlock - currentBlockNumber
      : 0n;

  const renderContent = () => {
    if (isMigrated) {
      return <SwapCard poolKey={poolKey} tokenAddr={tokenAddr} />;
    }

    if (!canMigrate && blocksUntilMigration > 0n) {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-purple">// awaiting migration window</p>
            <p className="text-xs text-dim">
              pool initialization available in{' '}
              <span className="text-yellow tabular-nums">
                {blocksUntilMigration.toString()}
              </span>{' '}
              blocks
            </p>
          </div>
          <div className="flex items-center gap-2 text-dim">
            <Loader type="dots" className="text-purple" />
            <span className="text-xs">waiting...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-yellow">// pool not initialized</p>
          <p className="text-xs text-dim">
            wow you're the first one here, let's get the party started:
          </p>
        </div>
        <Button
          onClick={handleInitializePool}
          disabled={isMigrating}
          className="mt-2"
        >
          {isMigrating ? (
            <>
              <Loader type="dots" className="mr-2" />
              initializing...
            </>
          ) : (
            '$ initialize_pool'
          )}
        </Button>
      </div>
    );
  };

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
      <div className="p-4">{renderContent()}</div>
    </div>
  );
};
