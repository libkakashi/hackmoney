import {type Chain, createPublicClient} from 'viem';
import {http, createConfig} from 'wagmi';
import {injected, walletConnect} from '@wagmi/connectors';
import * as chains from 'viem/chains';
import {env} from './env';

export const getChain = (chainId: number): Chain => {
  const chain = Object.values(chains).find(chain => chain.id === chainId);
  if (chain) return chain;

  if (chainId !== 69) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }
  return {
    id: chainId,
    name: 'Nyx Mainnet Fork',
    nativeCurrency: {name: 'Ether', symbol: 'ETH', decimals: 18},
    rpcUrls: {
      default: {http: [env.rpcUrl ?? '']},
    },
  };
};
export const chain = getChain(env.chainId);

export const publicClient = createPublicClient({
  chain,
  transport: http(env.rpcUrl),
});

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [
    injected({target: 'metaMask'}),
    injected({target: 'rabby'}),
    walletConnect({
      projectId: env.walletConnectProjectId,
      showQrModal: true,
    }),
  ],
  transports: {
    [chain.id]: http(env.rpcUrl, {
      batch: {
        batchSize: 1024,
        wait: 64, // ms to wait before sending batch
      },
    }),
  },
  ssr: true,
});
