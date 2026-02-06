'use client';

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  usePublicClient,
  useWalletClient,
  useConnection,
  useWriteContract,
} from 'wagmi';
import {
  type Address,
  type Hex,
  parseUnits,
  erc20Abi,
  zeroAddress,
  maxUint160,
  maxUint48,
} from 'viem';
import {usePermit2, PERMIT2_ADDRESS} from '../use-permit2';
import {getAuctionState} from '~/lib/cca/auction';
import {roundPriceToTick} from '~/lib/cca/utils';
import {ccaAbi} from '~/abi/cca';
import {permit2Abi} from '~/abi/permit2';

/**
 * Imperative bid submission hook — accepts auction address and amount at call time.
 * Designed for agent use where the target auction isn't known at hook init.
 */
export const useSubmitBidImperative = () => {
  const publicClient = usePublicClient();
  const {data: walletClient} = useWalletClient();
  const {address: userAddress} = useConnection();
  const {mutateAsync: writeContractAsync} = useWriteContract();
  const queryClient = useQueryClient();
  const {needsErc20Approval, needsPermit2Signature} = usePermit2();

  return useMutation({
    mutationFn: async ({
      auctionAddress,
      amount,
    }: {
      auctionAddress: string;
      amount: string;
    }): Promise<{txHash: Hex; amount: string}> => {
      if (!publicClient || !walletClient || !userAddress) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      const auctionAddr = auctionAddress as Address;
      const auctionState = await getAuctionState(auctionAddr, publicClient);

      if (auctionState.status !== 'active') {
        throw new Error(
          `Cannot bid: auction is '${auctionState.status}', not 'active'.`,
        );
      }

      const currency = auctionState.currency;
      const isNative = currency === zeroAddress;
      const parsedAmount = parseUnits(amount, auctionState.currencyDecimals);
      const hookData: Hex = '0x';

      // Handle ERC20 approvals if needed
      if (!isNative) {
        const needsApproval = await needsErc20Approval(currency, parsedAmount);
        if (needsApproval) {
          const approvalHash = await writeContractAsync({
            address: currency,
            abi: erc20Abi,
            functionName: 'approve',
            args: [PERMIT2_ADDRESS, 2n ** 256n - 1n],
          });
          await publicClient.waitForTransactionReceipt({hash: approvalHash});
        }

        const needsPermit = await needsPermit2Signature(
          currency,
          auctionAddr,
          1n,
        );
        if (needsPermit) {
          const approveHash = await writeContractAsync({
            address: PERMIT2_ADDRESS,
            abi: permit2Abi,
            functionName: 'approve',
            args: [currency, auctionAddr, maxUint160, Number(maxUint48)],
          });
          await publicClient.waitForTransactionReceipt({hash: approveHash});
        }
      }

      const maxBidPrice = await publicClient.readContract({
        address: auctionAddr,
        abi: ccaAbi,
        functionName: 'MAX_BID_PRICE',
      });
      const maxPriceQ96 = roundPriceToTick(
        maxBidPrice,
        auctionState.tickSpacingQ96,
        auctionState.floorPriceQ96,
      );

      // Simulate
      await publicClient.simulateContract({
        address: auctionAddr,
        abi: ccaAbi,
        functionName: 'submitBid',
        args: [maxPriceQ96, parsedAmount, userAddress, hookData],
        account: userAddress,
        value: isNative ? parsedAmount : 0n,
      });

      // Execute
      const hash = await writeContractAsync({
        address: auctionAddr,
        abi: ccaAbi,
        functionName: 'submitBid',
        args: [maxPriceQ96, parsedAmount, userAddress, hookData],
        value: isNative ? parsedAmount : 0n,
      });
      await publicClient.waitForTransactionReceipt({hash});

      return {txHash: hash, amount};
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
