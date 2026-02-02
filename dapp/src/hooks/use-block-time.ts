'use client';

import {useMemo} from 'react';
import {useBlock} from 'wagmi';

const BLOCK_TIME_MS_FALLBACK = 12000;
const DEFAULT_BLOCK_RANGE = 100n;

export interface BlockTimeData {
  currentBlock: bigint;
  blockTimeMs: number;
  referenceBlockTimestamp: number;
  referenceBlock: bigint;
}

export const useBlockTime = (startBlock?: bigint) => {
  const {
    data: currentBlockData,
    isLoading: isLoadingCurrent,
    error: currentError,
  } = useBlock({watch: true});

  const referenceBlockNumber = useMemo(() => {
    if (!currentBlockData) return undefined;
    return startBlock ?? currentBlockData.number - DEFAULT_BLOCK_RANGE;
  }, [currentBlockData, startBlock]);

  const {
    data: referenceBlockData,
    isLoading: isLoadingReference,
    error: referenceError,
  } = useBlock({
    blockNumber: referenceBlockNumber,
    query: {enabled: referenceBlockNumber !== undefined},
  });

  const data = useMemo<BlockTimeData | null>(() => {
    if (
      !currentBlockData ||
      !referenceBlockData ||
      referenceBlockNumber === undefined
    ) {
      return null;
    }
    const blocksDiff = Number(currentBlockData.number - referenceBlockNumber);
    const timeDiffSeconds = Number(
      currentBlockData.timestamp - referenceBlockData.timestamp,
    );
    const blockTimeMs =
      blocksDiff > 0
        ? (timeDiffSeconds / blocksDiff) * 1000
        : BLOCK_TIME_MS_FALLBACK;

    return {
      currentBlock: currentBlockData.number,
      blockTimeMs,
      referenceBlockTimestamp: Number(referenceBlockData.timestamp) * 1000,
      referenceBlock: referenceBlockNumber,
    };
  }, [currentBlockData, referenceBlockData, referenceBlockNumber]);

  const isLoading = isLoadingCurrent || isLoadingReference;
  const error = currentError || referenceError;

  return {data, isLoading, error};
};
