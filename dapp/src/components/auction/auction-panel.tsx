'use client';

import {useMemo} from 'react';
import type {Address} from 'viem';

import {Card, CardContent} from '~/components/ui/card';
import {PreAuctionPanel} from './pre-auction-panel';
import {ActiveAuctionPanel} from './active-auction-panel';
import {LoadingPanel} from './loading-panel';

import {useBlockTime} from '~/hooks/use-block-time';
import {useAuctionState} from '~/hooks/cca/use-auction-state';

export const AuctionPanel = ({auctionAddr}: {auctionAddr: Address}) => {
  const {data: auctionState, isPending: isLoading} =
    useAuctionState(auctionAddr);

  const isNotStarted = auctionState?.status === 'not_started';

  const {data: blockData} = useBlockTime(
    isNotStarted ? undefined : auctionState?.startBlock,
  );

  const {startTimestamp, endTimestamp} = useMemo(() => {
    if (!auctionState || !blockData) {
      return {startTimestamp: null, endTimestamp: null};
    }

    if (isNotStarted) {
      const blocksUntilStart = Number(
        auctionState.startBlock - blockData.currentBlock,
      );
      const estimatedStartTimestamp =
        Date.now() + blocksUntilStart * blockData.blockTimeMs;

      const blocksFromStartToEnd = Number(
        auctionState.endBlock - auctionState.startBlock,
      );
      const estimatedEndTimestamp =
        estimatedStartTimestamp + blocksFromStartToEnd * blockData.blockTimeMs;

      return {
        startTimestamp: estimatedStartTimestamp,
        endTimestamp: estimatedEndTimestamp,
      };
    }

    const actualStartTimestamp = blockData.referenceBlockTimestamp;
    const blocksFromStartToEnd = Number(
      auctionState.endBlock - auctionState.startBlock,
    );
    const estimatedEndTimestamp =
      actualStartTimestamp + blocksFromStartToEnd * blockData.blockTimeMs;

    return {
      startTimestamp: actualStartTimestamp,
      endTimestamp: estimatedEndTimestamp,
    };
  }, [auctionState, blockData, isNotStarted]);

  if (isLoading) {
    return <LoadingPanel />;
  }

  if (!auctionState) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            <p>Unable to load auction data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  switch (auctionState.status) {
    case 'not_started':
      return (
        <PreAuctionPanel
          auctionState={auctionState}
          startTimestamp={startTimestamp ?? Date.now() + 3600000}
        />
      );

    case 'active':
      return (
        <ActiveAuctionPanel
          auctionAddr={auctionAddr}
          auctionState={auctionState}
          startTimestamp={startTimestamp ?? Date.now()}
          endTimestamp={endTimestamp ?? Date.now() + 3600000}
        />
      );

    default:
      return null;
  }
};
