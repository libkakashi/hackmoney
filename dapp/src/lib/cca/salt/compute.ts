import {
  type Address,
  type Hex,
  keccak256,
  encodeAbiParameters,
  concat,
  pad,
  toHex,
  getContractAddress,
} from 'viem';
import {
  FULL_RANGE_LBP_STRATEGY_CREATION_CODE,
  UERC20_INIT_CODE_HASH,
} from './creationCodes';

const ALL_HOOK_MASK = BigInt((1 << 14) - 1);
const REQUIRED_HOOK_FLAGS = BigInt(1 << 13);
const TOKEN_DECIMALS = 18;
const PROGRESS_INTERVAL = 10_000;

export interface MigratorParams {
  migrationBlock: bigint;
  currency: Address;
  poolLPFee: number;
  poolTickSpacing: number;
  tokenSplit: number;
  initializerFactory: Address;
  positionRecipient: Address;
  sweepBlock: bigint;
  operator: Address;
  maxCurrencyAmountForLP: bigint;
}

export interface SaltMiningParams {
  caller: Address;
  name: string;
  symbol: string;
  launchpadAddress: Address;
  startBlock: bigint;
}

export interface SaltMiningResult {
  salt: Hex;
  predictedToken: Address;
  predictedStrategy: Address;
  iterations: number;
}

export interface LaunchpadConfig {
  migratorParams: MigratorParams;
  tokenFactory: Address;
  strategyFactory: Address;
  ccaFactory: Address;
  currency: Address;
  positionManager: Address;
  poolManager: Address;
  auctionParamsEncoded: Hex;
  totalSupply: bigint;
}

const encodeCallerSalt = (caller: Address, salt: Hex): Hex =>
  keccak256(
    encodeAbiParameters([{type: 'address'}, {type: 'bytes32'}], [caller, salt]),
  );

const computeTokenAddress = (
  tokenFactory: Address,
  name: string,
  symbol: string,
  creator: Address,
  graffiti: Hex,
): Address => {
  const salt = keccak256(
    encodeAbiParameters(
      [
        {type: 'string'},
        {type: 'string'},
        {type: 'uint8'},
        {type: 'address'},
        {type: 'bytes32'},
      ],
      [name, symbol, TOKEN_DECIMALS, creator, graffiti],
    ),
  );

  return getContractAddress({
    bytecodeHash: UERC20_INIT_CODE_HASH,
    from: tokenFactory,
    opcode: 'CREATE2',
    salt,
  });
};

const computeStrategyAddress = (
  strategyFactory: Address,
  token: Address,
  totalSupply: bigint,
  config: LaunchpadConfig,
  launchpadAddress: Address,
  salt: Hex,
): Address => {
  // The strategy factory hashes (sender, salt) where sender is the launchpad contract
  // that calls getAddress, not the user/caller
  const strategySaltHash = encodeCallerSalt(launchpadAddress, salt);

  // Ensure migratorParams is encoded with exact field order matching Solidity struct
  const migratorParamsTuple = {
    migrationBlock: config.migratorParams.migrationBlock,
    currency: config.migratorParams.currency,
    poolLPFee: config.migratorParams.poolLPFee,
    poolTickSpacing: config.migratorParams.poolTickSpacing,
    tokenSplit: config.migratorParams.tokenSplit,
    initializerFactory: config.migratorParams.initializerFactory,
    positionRecipient: config.migratorParams.positionRecipient,
    sweepBlock: config.migratorParams.sweepBlock,
    operator: config.migratorParams.operator,
    maxCurrencyAmountForLP: config.migratorParams.maxCurrencyAmountForLP,
  };

  const constructorArgs = encodeAbiParameters(
    [
      {type: 'address'},
      {type: 'uint128'},
      {
        type: 'tuple',
        components: [
          {name: 'migrationBlock', type: 'uint64'},
          {name: 'currency', type: 'address'},
          {name: 'poolLPFee', type: 'uint24'},
          {name: 'poolTickSpacing', type: 'int24'},
          {name: 'tokenSplit', type: 'uint24'},
          {name: 'initializerFactory', type: 'address'},
          {name: 'positionRecipient', type: 'address'},
          {name: 'sweepBlock', type: 'uint64'},
          {name: 'operator', type: 'address'},
          {name: 'maxCurrencyAmountForLP', type: 'uint128'},
        ],
      },
      {type: 'bytes'},
      {type: 'address'},
      {type: 'address'},
    ],
    [
      token,
      totalSupply,
      migratorParamsTuple,
      config.auctionParamsEncoded,
      config.positionManager,
      config.poolManager,
    ],
  );

  const initCodeHash = keccak256(
    concat([FULL_RANGE_LBP_STRATEGY_CREATION_CODE, constructorArgs]),
  );

  return getContractAddress({
    bytecodeHash: initCodeHash,
    from: strategyFactory,
    opcode: 'CREATE2',
    salt: strategySaltHash,
  });
};

const isValidHookAddress = (address: Address): boolean =>
  (BigInt(address) & ALL_HOOK_MASK) === REQUIRED_HOOK_FLAGS;

export const computeAddresses = (
  params: SaltMiningParams,
  config: LaunchpadConfig,
  salt: Hex,
) => {
  // For the token, graffiti = keccak256(abi.encode(caller, salt))
  const callerSaltHash = encodeCallerSalt(params.caller, salt);

  const predictedToken = computeTokenAddress(
    config.tokenFactory,
    params.name,
    params.symbol,
    params.launchpadAddress,
    callerSaltHash,
  );

  // For the strategy, the sender is the launchpad contract, not the caller
  const predictedStrategy = computeStrategyAddress(
    config.strategyFactory,
    predictedToken,
    config.totalSupply,
    config,
    params.launchpadAddress,
    salt,
  );

  return {predictedToken, predictedStrategy};
};

export const validateSalt = (
  params: SaltMiningParams,
  config: LaunchpadConfig,
  salt: Hex,
) => {
  const {predictedToken, predictedStrategy} = computeAddresses(
    params,
    config,
    salt,
  );

  return {
    valid: isValidHookAddress(predictedStrategy),
    predictedToken,
    predictedStrategy,
  };
};

export const mineSalt = (
  params: SaltMiningParams,
  config: LaunchpadConfig,
  maxIterations = 1_000_000,
  onProgress?: (iteration: number) => void,
): SaltMiningResult => {
  for (let i = 0; i < maxIterations; i++) {
    if (onProgress && i > 0 && i % PROGRESS_INTERVAL === 0) {
      onProgress(i);
    }

    const salt = pad(toHex(BigInt(i)), {size: 32});
    const {predictedToken, predictedStrategy} = computeAddresses(
      params,
      config,
      salt,
    );

    if (isValidHookAddress(predictedStrategy)) {
      return {salt, predictedToken, predictedStrategy, iterations: i + 1};
    }
  }

  throw new Error(`No valid salt found in ${maxIterations} iterations`);
};

// Serialization for worker communication (bigints can't be transferred via postMessage)
export interface SerializedMigratorParams {
  migrationBlock: string;
  currency: Address;
  poolLPFee: number;
  poolTickSpacing: number;
  tokenSplit: number;
  initializerFactory: Address;
  positionRecipient: Address;
  sweepBlock: string;
  operator: Address;
  maxCurrencyAmountForLP: string;
}

export interface SerializedSaltMiningParams {
  caller: Address;
  name: string;
  symbol: string;
  launchpadAddress: Address;
  startBlock: string;
}

export interface SerializedLaunchpadConfig {
  migratorParams: SerializedMigratorParams;
  tokenFactory: Address;
  strategyFactory: Address;
  ccaFactory: Address;
  currency: Address;
  positionManager: Address;
  poolManager: Address;
  auctionParamsEncoded: Hex;
  totalSupply: string;
}

export const serializeParams = (
  params: SaltMiningParams,
): SerializedSaltMiningParams => ({
  ...params,
  startBlock: params.startBlock.toString(),
});

export const serializeConfig = (
  config: LaunchpadConfig,
): SerializedLaunchpadConfig => ({
  ...config,
  migratorParams: {
    ...config.migratorParams,
    migrationBlock: config.migratorParams.migrationBlock.toString(),
    sweepBlock: config.migratorParams.sweepBlock.toString(),
    maxCurrencyAmountForLP:
      config.migratorParams.maxCurrencyAmountForLP.toString(),
  },
  totalSupply: config.totalSupply.toString(),
});

export const deserializeParams = (
  params: SerializedSaltMiningParams,
): SaltMiningParams => ({
  ...params,
  startBlock: BigInt(params.startBlock),
});

export const deserializeConfig = (
  config: SerializedLaunchpadConfig,
): LaunchpadConfig => ({
  ...config,
  migratorParams: {
    ...config.migratorParams,
    migrationBlock: BigInt(config.migratorParams.migrationBlock),
    sweepBlock: BigInt(config.migratorParams.sweepBlock),
    maxCurrencyAmountForLP: BigInt(
      config.migratorParams.maxCurrencyAmountForLP,
    ),
  },
  totalSupply: BigInt(config.totalSupply),
});
