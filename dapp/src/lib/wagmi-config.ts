import type {Chain} from 'viem';
import {createConfig, http} from 'wagmi';
import {injected, walletConnect} from '@wagmi/connectors';
import * as chains from 'viem/chains';
import {env} from './env';

export const getChain = (chainId: number): Chain => {
  const chain = Object.values(chains).find(chain => chain.id === chainId);

  if (!chain) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }
  return chain;
};
export const chain = getChain(env.chainId);

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
  transports: {[chain.id]: http(env.rpcUrl)},
  ssr: true,
});
