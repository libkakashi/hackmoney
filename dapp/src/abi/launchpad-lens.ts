export const launchpadLensAbi = [
  {
    type: 'function',
    name: 'getPoolInfo',
    inputs: [
      { name: 'poolManager', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'currency', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickSpacing', type: 'int24' },
    ],
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'isInitialized', type: 'bool' },
          { name: 'sqrtPriceX96', type: 'uint160' },
          { name: 'tick', type: 'int24' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPoolPrice',
    inputs: [
      { name: 'poolManager', type: 'address' },
      {
        name: 'poolKey',
        type: 'tuple',
        components: [
          { name: 'currency0', type: 'address' },
          { name: 'currency1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickSpacing', type: 'int24' },
          { name: 'hooks', type: 'address' },
        ],
      },
    ],
    outputs: [
      {
        name: 'result',
        type: 'tuple',
        components: [
          { name: 'tick', type: 'int24' },
          { name: 'sqrtPriceX96', type: 'uint160' },
          { name: 'priceE18', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokenData',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      {
        name: 'data',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
          { name: 'decimals', type: 'uint8' },
          { name: 'totalSupply', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;
