import {
  type Address,
  type Hex,
  type PublicClient,
  encodeAbiParameters,
} from 'viem';
import {launchpadAbi} from '~/abi/launchpad';

export type {
  SaltMiningParams,
  SaltMiningResult,
  LaunchpadConfig,
  MigratorParams,
} from './compute';

export {mineSalt, validateSalt} from './compute';
export {mineSaltAsync} from './worker-runner';

export const fetchLaunchpadConfig = async (
  publicClient: PublicClient,
  launchpadAddress: Address,
  startBlock: bigint,
) => {
  const [strategyConfigResult, totalSupply] = await Promise.all([
    publicClient.readContract({
      address: launchpadAddress,
      abi: launchpadAbi,
      functionName: 'getStrategyConfig',
      args: [startBlock],
    }),
    publicClient.readContract({
      address: launchpadAddress,
      abi: launchpadAbi,
      functionName: 'TOTAL_SUPPLY',
    }),
  ]);

  const [
    migratorParams,
    auctionParamsEncoded,
    tokenFactory,
    strategyFactory,
    ccaFactory,
    currency,
    positionManager,
    poolManager,
  ] = strategyConfigResult;

  return {
    migratorParams,
    tokenFactory,
    strategyFactory,
    ccaFactory,
    currency,
    positionManager,
    poolManager,
    auctionParamsEncoded,
    totalSupply,
  };
};

export const encodeTokenMetadata = (metadata: {
  description?: string;
  website?: string;
  image?: string;
}): Hex =>
  encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          {name: 'description', type: 'string'},
          {name: 'website', type: 'string'},
          {name: 'image', type: 'string'},
        ],
      },
    ],
    [
      {
        description: metadata.description ?? '',
        website: metadata.website ?? '',
        image: metadata.image ?? '',
      },
    ],
  );
