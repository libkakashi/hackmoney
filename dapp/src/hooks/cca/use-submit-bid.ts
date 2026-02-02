'use client';

import {useMutation, useQueryClient} from '@tanstack/react-query';
import {
  usePublicClient,
  useWalletClient,
  useConnection,
  useWriteContract,
} from 'wagmi';
import {type Address, type Hex, erc20Abi, zeroAddress} from 'viem';
import {useAuctionState} from './use-auction-state';
import {usePermit2, PERMIT2_ADDRESS} from '../use-permit2';
import {roundPriceToTick} from '~/lib/cca/utils';
import {ccaAbi} from '~/abi/cca';
import {permit2Abi} from '~/abi/permit2';

export const useSubmitBid = (auctionAddr: Address) => {
  const publicClient = usePublicClient();
  const {data: walletClient} = useWalletClient();
  const {address: userAddress} = useConnection();
  const {mutateAsync: writeContractAsync} = useWriteContract();
  const queryClient = useQueryClient();

  const {data: auctionState} = useAuctionState(auctionAddr);

  const {needsErc20Approval, needsPermit2Signature, signPermitSingle} =
    usePermit2();

  return useMutation({
    mutationFn: async (amount: bigint): Promise<Hex> => {
      if (!publicClient || !walletClient || !userAddress || !auctionState) {
        throw new Error('Wallet not connected');
      }
      const currency = auctionState.currency;
      const isNative = currency === zeroAddress;
      const hookData: Hex = '0x';

      if (!isNative) {
        console.log('[bid] Checking ERC20 approval to Permit2...');
        const needsApproval = await needsErc20Approval(currency, amount);

        if (needsApproval) {
          console.log('[bid] Approving ERC20 to Permit2...');
          const approvalHash = await writeContractAsync({
            address: currency,
            abi: erc20Abi,
            functionName: 'approve',
            args: [PERMIT2_ADDRESS, 2n ** 256n - 1n],
          });
          console.log('[bid] ERC20 approval tx:', approvalHash);
          await publicClient.waitForTransactionReceipt({hash: approvalHash});
          console.log('[bid] ERC20 approval confirmed');
        }

        console.log('[bid] Checking Permit2 allowance for auction...');
        const needsPermit = await needsPermit2Signature(
          currency,
          auctionAddr,
          amount,
        );

        if (needsPermit) {
          console.log('[bid] Signing and submitting Permit2 allowance...');
          const {permitSingle, signature} = await signPermitSingle(
            currency,
            auctionAddr,
            amount,
          );

          const permitHash = await writeContractAsync({
            address: PERMIT2_ADDRESS,
            abi: permit2Abi,
            functionName: 'permit',
            args: [userAddress, permitSingle, signature],
          });
          console.log('[bid] Permit2 allowance tx:', permitHash);
          await publicClient.waitForTransactionReceipt({hash: permitHash});
          console.log('[bid] Permit2 allowance confirmed');
        }
      }

      console.log('[bid] Fetching MAX_BID_PRICE from contract...');
      const maxBidPrice = await publicClient.readContract({
        address: auctionAddr,
        abi: ccaAbi,
        functionName: 'MAX_BID_PRICE',
      });
      console.log('[bid] MAX_BID_PRICE:', maxBidPrice.toString());

      const maxPriceQ96 = roundPriceToTick(
        maxBidPrice,
        auctionState.tickSpacingQ96,
        auctionState.floorPriceQ96,
      );
      console.log('[bid] Rounded max price Q96:', maxPriceQ96.toString());

      console.log('[bid] Simulating bid transaction...');
      await publicClient.simulateContract({
        address: auctionAddr,
        abi: ccaAbi,
        functionName: 'submitBid',
        args: [maxPriceQ96, amount, userAddress, hookData],
        account: userAddress,
        value: isNative ? amount : 0n,
      });
      console.log('[bid] Simulation successful');

      const hash = await writeContractAsync({
        address: auctionAddr,
        abi: ccaAbi,
        functionName: 'submitBid',
        args: [maxPriceQ96, amount, userAddress, hookData],
        value: isNative ? amount : 0n,
      });
      await publicClient.waitForTransactionReceipt({hash});

      console.log('[bid] Bid transaction sent:', hash);
      return hash;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
