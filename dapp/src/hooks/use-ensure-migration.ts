'use client';

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useBlock, usePublicClient, useWriteContract} from 'wagmi';
import type {Address} from 'viem';
import {toast} from 'sonner';
import {lBPStrategyBaseAbi} from '~/abi/lbp-strategy-base';
import {ccaAbi} from '~/abi/cca';
import {useTokenByAddress} from './use-tokens';
import {useStrategyState} from './cca/use-strategy-state';

export const useEnsureMigration = (tokenAddr?: Address) => {
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  const {data: token} = useTokenByAddress(tokenAddr);
  const {data: strategyState} = useStrategyState(token?.strategy);
  const {data: currentBlock} = useBlock({watch: true});

  const {mutateAsync: writeContractAsync} = useWriteContract();

  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!publicClient) throw new Error('Public client not available');
      if (!token) throw new Error('Token data not loaded');
      if (!strategyState) throw new Error('Strategy state not loaded');
      if (!currentBlock) throw new Error('Block data not loaded');

      if (strategyState.isMigrated) return true;

      const {migrationBlock} = strategyState;
      const auctionEndBlock = BigInt(token.auctionEndBlock);

      if (currentBlock.number < auctionEndBlock) {
        throw new Error(
          `Auction not yet ended. Ends at block ${auctionEndBlock}, current: ${currentBlock.number}`,
        );
      }

      // Check if sweep has already been done by reading sweepCurrencyBlock
      const sweepCurrencyBlock = await publicClient.readContract({
        address: token.auction,
        abi: ccaAbi,
        functionName: 'sweepCurrencyBlock',
      });

      const needsSweep = sweepCurrencyBlock === 0n;

      if (needsSweep) {
        // sweepCurrency has ensureEndBlockIsCheckpointed modifier,
        // so it will checkpoint if needed
        toast.info('Preparing pool...', {
          description: 'Sweeping auction funds to liquidity pool',
        });

        const sweepHash = await writeContractAsync({
          address: token.auction,
          abi: ccaAbi,
          functionName: 'sweepCurrency',
        });

        await publicClient.waitForTransactionReceipt({hash: sweepHash});
        toast.success('Auction funds swept');
      } else {
        // If sweep already done, we still need to ensure auction is checkpointed
        const lastCheckpointedBlock = await publicClient.readContract({
          address: token.auction,
          abi: ccaAbi,
          functionName: 'lastCheckpointedBlock',
        });

        if (lastCheckpointedBlock < auctionEndBlock) {
          toast.info('Finalizing auction...', {
            description: 'Checkpointing auction at end block',
          });

          const checkpointHash = await writeContractAsync({
            address: token.auction,
            abi: ccaAbi,
            functionName: 'checkpoint',
          });

          await publicClient.waitForTransactionReceipt({hash: checkpointHash});
          toast.success('Auction finalized');
        }
      }

      if (currentBlock.number < migrationBlock) {
        throw new Error(
          `Migration not yet available. Available at block ${migrationBlock}, current: ${currentBlock.number}`,
        );
      }

      toast.info('Creating liquidity pool...', {
        description: 'Migrating to Uniswap V4',
      });

      const migrateHash = await writeContractAsync({
        address: token.strategy,
        abi: lBPStrategyBaseAbi,
        functionName: 'migrate',
      });

      await publicClient.waitForTransactionReceipt({hash: migrateHash});
      toast.success('Pool created successfully!');

      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
    onError: err => {
      console.error('[useEnsureMigration] Error:', err);
      const error = err as Error & {shortMessage?: string};
      const errorMsg = error.shortMessage || error.message || '';

      // Check if error indicates already migrated
      if (
        errorMsg.includes('already') ||
        errorMsg.includes('initialized') ||
        errorMsg.includes('POOL_ALREADY')
      ) {
        void queryClient.invalidateQueries();
        return;
      }

      toast.error('Migration failed', {
        description: error.shortMessage || error.message,
      });
    },
  });
};
