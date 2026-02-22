export const launchpadAbi = [
  {
    type: 'constructor',
    inputs: [
      { name: 'positionManager', type: 'address' },
      { name: 'poolManager', type: 'address' },
      { name: 'currency', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'CURRENCY',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'POOL_LP_FEE',
    inputs: [],
    outputs: [{ name: '', type: 'uint24' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'POOL_MANAGER',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'POOL_TICK_SPACING',
    inputs: [],
    outputs: [{ name: '', type: 'int24' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'TOTAL_SUPPLY',
    inputs: [],
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'launch',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
    ],
    outputs: [{ name: 'token', type: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'TokenLaunched',
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'symbol', type: 'string', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'ReentrancyGuardReentrantCall',
    inputs: [],
  },
] as const;
