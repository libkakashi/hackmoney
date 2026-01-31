import {createPublicClient, http, type Address} from 'viem';
import {createSiweMessage, parseSiweMessage, type SiweMessage} from 'viem/siwe';
import {chain} from '../wagmi-config';

export type {SiweMessage};

const publicClient = createPublicClient({
  chain,
  transport: http(),
});

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function createMessage({
  address,
  nonce,
  chainId,
  domain,
  uri,
  statement,
  expirationTime,
}: {
  address: Address;
  nonce: string;
  chainId: number;
  domain: string;
  uri: string;
  statement?: string;
  expirationTime?: Date;
}): string {
  return createSiweMessage({
    address,
    chainId,
    domain,
    nonce,
    uri,
    version: '1',
    statement: statement ?? 'Sign in to Launchpad',
    expirationTime,
  });
}

export async function verifyMessage({
  message,
  signature,
}: {
  message: string;
  signature: `0x${string}`;
}): Promise<
  {success: true; address: Address} | {success: false; error: string}
> {
  try {
    const valid = await publicClient.verifySiweMessage({
      message,
      signature,
    });

    if (!valid) {
      return {success: false, error: 'Invalid signature'};
    }

    const parsed = parseSiweMessage(message);
    if (!parsed.address) {
      return {success: false, error: 'Could not parse address from message'};
    }

    return {success: true, address: parsed.address};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}
