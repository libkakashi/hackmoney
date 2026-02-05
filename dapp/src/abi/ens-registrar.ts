import type {Address} from 'viem';

// ENS ETHRegistrarController ABI (latest version with Registration struct)
export const ensRegistrarControllerAbi = [
  // Read functions
  {
    name: 'available',
    type: 'function',
    stateMutability: 'view',
    inputs: [{name: 'label', type: 'string'}],
    outputs: [{name: '', type: 'bool'}],
  },
  {
    name: 'rentPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {name: 'label', type: 'string'},
      {name: 'duration', type: 'uint256'},
    ],
    outputs: [
      {
        name: 'price',
        type: 'tuple',
        components: [
          {name: 'base', type: 'uint256'},
          {name: 'premium', type: 'uint256'},
        ],
      },
    ],
  },
  {
    name: 'makeCommitment',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      {
        name: 'registration',
        type: 'tuple',
        components: [
          {name: 'label', type: 'string'},
          {name: 'owner', type: 'address'},
          {name: 'duration', type: 'uint256'},
          {name: 'secret', type: 'bytes32'},
          {name: 'resolver', type: 'address'},
          {name: 'data', type: 'bytes[]'},
          {name: 'reverseRecord', type: 'uint8'},
          {name: 'referrer', type: 'bytes32'},
        ],
      },
    ],
    outputs: [{name: '', type: 'bytes32'}],
  },
  {
    name: 'commitments',
    type: 'function',
    stateMutability: 'view',
    inputs: [{name: 'commitment', type: 'bytes32'}],
    outputs: [{name: '', type: 'uint256'}],
  },
  // Write functions
  {
    name: 'commit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{name: 'commitment', type: 'bytes32'}],
    outputs: [],
  },
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'registration',
        type: 'tuple',
        components: [
          {name: 'label', type: 'string'},
          {name: 'owner', type: 'address'},
          {name: 'duration', type: 'uint256'},
          {name: 'secret', type: 'bytes32'},
          {name: 'resolver', type: 'address'},
          {name: 'data', type: 'bytes[]'},
          {name: 'reverseRecord', type: 'uint8'},
          {name: 'referrer', type: 'bytes32'},
        ],
      },
    ],
    outputs: [],
  },
] as const;

// Contract addresses by chain ID
export const ENS_REGISTRAR_ADDRESSES: Record<number, Address> = {
  1: '0x59E16fcCd424Cc24e280Be16E11Bcd56fb0CE547', // Mainnet
  11155111: '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968', // Sepolia
};

// Public Resolver addresses by chain ID
export const ENS_PUBLIC_RESOLVER: Record<number, Address> = {
  1: '0xF29100983E058B709F3D539b0c765937B804AC15', // Mainnet
  11155111: '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5', // Sepolia
};

// Supported chain IDs for ENS
export const ENS_SUPPORTED_CHAINS = [1, 11155111] as const;

// Registration constants
export const ENS_MIN_COMMITMENT_AGE = 60; // 60 seconds minimum wait
export const ENS_MAX_COMMITMENT_AGE = 86400; // 24 hours maximum
export const ENS_DEFAULT_DURATION = 31536000; // 1 year in seconds
export const ENS_MIN_NAME_LENGTH = 3; // Minimum name length
