'use client';

import {useReadContract, useBalance} from 'wagmi';
import {type Address, erc20Abi, zeroAddress} from 'viem';

const isNativeCurrency = (address?: Address) =>
  address?.toLowerCase() === zeroAddress;

export const useTokenBalance = (
  tokenAddress?: Address,
  userAddress?: Address,
) => {
  const isNative = isNativeCurrency(tokenAddress);

  const erc20Result = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {enabled: !isNative && !!tokenAddress && !!userAddress},
  });

  const nativeResult = useBalance({
    address: userAddress,
    query: {enabled: isNative && !!userAddress},
  });

  if (isNative) {
    return {
      ...nativeResult,
      data: nativeResult.data?.value,
    };
  }

  return erc20Result;
};
