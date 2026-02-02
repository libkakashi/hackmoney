'use client';

import {useReadContract} from 'wagmi';
import {type Address, erc20Abi} from 'viem';

export const useTokenBalance = (
  tokenAddress?: Address,
  userAddress?: Address,
) => {
  return useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });
};
