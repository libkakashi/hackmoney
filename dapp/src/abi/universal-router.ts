export const universalRouterAbi = [
  {
    type: 'function',
    name: 'execute',
    inputs: [
      {name: 'commands', type: 'bytes', internalType: 'bytes'},
      {name: 'inputs', type: 'bytes[]', internalType: 'bytes[]'},
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [
      {name: 'commands', type: 'bytes', internalType: 'bytes'},
      {name: 'inputs', type: 'bytes[]', internalType: 'bytes[]'},
      {name: 'deadline', type: 'uint256', internalType: 'uint256'},
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'error',
    name: 'ExecutionFailed',
    inputs: [
      {name: 'commandIndex', type: 'uint256', internalType: 'uint256'},
      {name: 'message', type: 'bytes', internalType: 'bytes'},
    ],
  },
  {
    type: 'error',
    name: 'DeadlineExpired',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ETHNotAccepted',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientETH',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InsufficientToken',
    inputs: [],
  },
  {
    type: 'error',
    name: 'InvalidBips',
    inputs: [],
  },
  {
    type: 'error',
    name: 'LengthMismatch',
    inputs: [],
  },
] as const;
