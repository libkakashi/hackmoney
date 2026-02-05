import type {Hex} from 'viem';
import {toHex} from 'viem';
import {
  ENS_REGISTRAR_ADDRESSES,
  ENS_PUBLIC_RESOLVER,
} from '~/abi/ens-registrar';

export const getRegistrarAddress = (chainId: number) =>
  ENS_REGISTRAR_ADDRESSES[chainId] ?? ENS_REGISTRAR_ADDRESSES[1];

export const getResolverAddress = (chainId: number) =>
  ENS_PUBLIC_RESOLVER[chainId] ?? ENS_PUBLIC_RESOLVER[1];

export const generateSecret = (): Hex => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(randomBytes);
};

const STORAGE_KEY = 'ens-commitment';

export interface CommitmentData {
  name: string;
  secret: Hex;
  commitmentHash: Hex;
  timestamp: number;
  txHash: Hex;
}

export const getStoredCommitment = (name: string): CommitmentData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${name}`);
    if (!stored) return null;
    return JSON.parse(stored) as CommitmentData;
  } catch {
    return null;
  }
};

export const storeCommitment = (data: CommitmentData) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEY}-${data.name}`, JSON.stringify(data));
};

export const clearStoredCommitment = (name: string) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEY}-${name}`);
};
