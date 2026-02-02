import {formatUnits, type Address} from 'viem';
import {erc20Abi} from 'viem';
import {usePublicClient} from 'wagmi';
import {useQuery} from '@tanstack/react-query';

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export const useTokenData = (tokenAddr?: Address) => {
  const publicClient = usePublicClient();

  return useQuery<TokenInfo, Error>({
    queryKey: ['erc20TokenInfo', tokenAddr],
    queryFn: async () => {
      if (!tokenAddr || !publicClient) {
        throw new Error('Token address is required');
      }
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        publicClient.readContract({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: 'name',
        }),
        publicClient.readContract({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: tokenAddr,
          abi: erc20Abi,
          functionName: 'totalSupply',
        }),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        totalSupply: formatUnits(totalSupply as bigint, decimals as number),
      };
    },
    enabled: !!tokenAddr && !!publicClient,
  });
};
