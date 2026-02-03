import {formatUnits, type Address} from 'viem';
import {usePublicClient} from 'wagmi';
import {useQuery} from '@tanstack/react-query';
import {launchpadLensAbi} from '~/abi/launchpad-lens';
import {env} from '~/lib/env';

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

      const data = await publicClient.readContract({
        address: env.launchpadLensAddr,
        abi: launchpadLensAbi,
        functionName: 'getTokenData',
        args: [tokenAddr],
      });

      return {
        name: data.name,
        symbol: data.symbol,
        decimals: data.decimals,
        totalSupply: formatUnits(data.totalSupply, data.decimals),
      };
    },
    enabled: !!tokenAddr && !!publicClient,
  });
};
