export const permit2Abi = [
  {
    type: 'function',
    name: 'permit',
    inputs: [
      {name: 'owner', type: 'address'},
      {
        name: 'permitSingle',
        type: 'tuple',
        components: [
          {
            name: 'details',
            type: 'tuple',
            components: [
              {name: 'token', type: 'address'},
              {name: 'amount', type: 'uint160'},
              {name: 'expiration', type: 'uint48'},
              {name: 'nonce', type: 'uint48'},
            ],
          },
          {name: 'spender', type: 'address'},
          {name: 'sigDeadline', type: 'uint256'},
        ],
      },
      {name: 'signature', type: 'bytes'},
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      {name: 'owner', type: 'address'},
      {name: 'token', type: 'address'},
      {name: 'spender', type: 'address'},
    ],
    outputs: [
      {name: 'amount', type: 'uint160'},
      {name: 'expiration', type: 'uint48'},
      {name: 'nonce', type: 'uint48'},
    ],
    stateMutability: 'view',
  },
  // For reading SignatureTransfer nonces
  {
    type: 'function',
    name: 'nonceBitmap',
    inputs: [
      {name: 'owner', type: 'address'},
      {name: 'wordPos', type: 'uint256'},
    ],
    outputs: [{name: '', type: 'uint256'}],
    stateMutability: 'view',
  },
] as const;
