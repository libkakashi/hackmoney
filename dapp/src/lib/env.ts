// import type {Address} from 'viem';
import {z} from 'zod';

// const ZHex = z
//   .string()
//   .regex(/^0x[0-9a-fA-F]+$/, 'Must be a valid hex string')
//   .transform(val => val as Hex);

// const ZAddress = z
//   .string()
//   .regex(
//     /^0x[a-fA-F0-9]{40}$/,
//     'Must be a valid Ethereum address starting with 0x',
//   )
//   .transform(val => val as Address);

const envSchema = z.object({
  walletConnectProjectId: z.string(),
  rpcUrl: z.url().optional(),
  chainId: z.number(),
});

export const env = envSchema.parse({
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
});
