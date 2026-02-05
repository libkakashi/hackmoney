import type {Address} from 'viem';
import {z} from 'zod';

// const ZHex = z
//   .string()
//   .regex(/^0x[0-9a-fA-F]+$/, 'Must be a valid hex string')
//   .transform(val => val as Hex);

const ZAddress = z
  .string()
  .regex(
    /^0x[a-fA-F0-9]{40}$/,
    'Must be a valid Ethereum address starting with 0x',
  )
  .transform(val => val as Address);

const envSchema = z.object({
  walletConnectProjectId: z.string(),
  rpcUrl: z.url().optional(),
  chainId: z.number(),
  sessionSecret: z.string().min(32).optional(),
  launchpadAddr: ZAddress,
  launchpadLensAddr: ZAddress,
  graphqlUrl: z.string(),
  anthropicApiKey: z.string().optional(),
  databaseUrl: z.string().optional(),
  pinataJwt: z.string().optional(),
  pinataGateway: z.string().optional(),
});

export const env = envSchema.parse({
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID),
  sessionSecret: process.env.SESSION_SECRET,
  launchpadAddr: process.env.NEXT_PUBLIC_LAUNCHPAD_ADDR,
  launchpadLensAddr: process.env.NEXT_PUBLIC_LAUNCHPAD_LENS_ADDR,
  graphqlUrl:
    process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8080/v1/graphql',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  databaseUrl: process.env.DATABASE_URL,
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY,
});
