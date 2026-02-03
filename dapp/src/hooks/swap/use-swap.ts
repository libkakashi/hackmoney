import {useCallback, useState} from 'react';
import {useWriteContract, usePublicClient, useConnection} from 'wagmi';
import {toast} from 'sonner';
import {
  Hex,
  Address,
  encodeAbiParameters,
  concat,
  maxUint128,
  erc20Abi,
  maxUint48,
  maxUint160,
} from 'viem';
import {universalRouterAbi} from '~/abi/universal-router';
import {usePermit2, PERMIT2_ADDRESS, type PermitSingle} from '../use-permit2';

export enum Actions {
  INCREASE_LIQUIDITY = 0,
  DECREASE_LIQUIDITY = 1,
  MINT_POSITION = 2,
  BURN_POSITION = 3,
  SWAP_EXACT_IN_SINGLE = 6,
  SWAP_EXACT_IN = 7,
  SWAP_EXACT_OUT_SINGLE = 8,
  SWAP_EXACT_OUT = 9,
  SETTLE = 11,
  SETTLE_ALL = 12,
  SETTLE_PAIR = 13,
  TAKE = 14,
  TAKE_ALL = 15,
  TAKE_PORTION = 16,
  TAKE_PAIR = 17,
  CLOSE_CURRENCY = 18,
  SWEEP = 20,
  UNWRAP = 22,
}

export const Commands = {
  // V4 Commands
  V4_SWAP: 0x10,
  // Other common commands
  PERMIT2_PERMIT: 0x0a,
  WRAP_ETH: 0x0b,
  UNWRAP_WETH: 0x0c,
  SWEEP: 0x04,
} as const;

const UNIVERSAL_ROUTER = '0x66a9893cc07d91d95644aedd05d03f95e1dba8af';

const toHex = (n: number): Hex => `0x${n.toString(16).padStart(2, '0')}` as Hex;

const validateUint128 = (value: bigint, name: string): void => {
  if (value > maxUint128) {
    throw new Error(`${name} exceeds uint128 max: ${value.toString()}`);
  }
};

type PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};

const getTokens = (poolKey: PoolKey, zeroForOne: boolean) => ({
  tokenIn: zeroForOne ? poolKey.currency0 : poolKey.currency1,
  tokenOut: zeroForOne ? poolKey.currency1 : poolKey.currency0,
});

const POOL_KEY_ABI = [
  {type: 'address', name: 'currency0'},
  {type: 'address', name: 'currency1'},
  {type: 'uint24', name: 'fee'},
  {type: 'int24', name: 'tickSpacing'},
  {type: 'address', name: 'hooks'},
] as const;

const SWAP_EXACT_IN_SINGLE_ABI = [
  {
    type: 'tuple',
    components: [
      {type: 'tuple', name: 'poolKey', components: POOL_KEY_ABI},
      {type: 'bool', name: 'zeroForOne'},
      {type: 'uint128', name: 'amountIn'},
      {type: 'uint128', name: 'amountOutMinimum'},
      {type: 'bytes', name: 'hookData'},
    ],
  },
] as const;

const SWAP_EXACT_OUT_SINGLE_ABI = [
  {
    type: 'tuple',
    components: [
      {type: 'tuple', name: 'poolKey', components: POOL_KEY_ABI},
      {type: 'bool', name: 'zeroForOne'},
      {type: 'uint128', name: 'amountOut'},
      {type: 'uint128', name: 'amountInMaximum'},
      {type: 'bytes', name: 'hookData'},
    ],
  },
] as const;

const V4_SWAP_ABI = [
  {type: 'bytes', name: 'actions'},
  {type: 'bytes[]', name: 'params'},
] as const;

const encodeSettleAll = (currency: Address, maxAmount: bigint): Hex =>
  encodeAbiParameters(
    [{type: 'address'}, {type: 'uint128'}],
    [currency, maxAmount],
  );

const encodeTakeAll = (currency: Address, minAmount: bigint): Hex =>
  encodeAbiParameters(
    [{type: 'address'}, {type: 'uint128'}],
    [currency, minAmount],
  );

// Encode PERMIT2_PERMIT command input for AllowanceTransfer
const encodePermit2Permit = (
  permitSingle: PermitSingle,
  signature: Hex,
): Hex => {
  // ABI: (address owner, PermitSingle permitSingle, bytes signature)
  // But for Universal Router, the owner is msg.sender, so encoding is:
  // abi.encode(IAllowanceTransfer.PermitSingle, bytes signature)
  return encodeAbiParameters(
    [
      {
        type: 'tuple',
        components: [
          {
            type: 'tuple',
            name: 'details',
            components: [
              {type: 'address', name: 'token'},
              {type: 'uint160', name: 'amount'},
              {type: 'uint48', name: 'expiration'},
              {type: 'uint48', name: 'nonce'},
            ],
          },
          {type: 'address', name: 'spender'},
          {type: 'uint256', name: 'sigDeadline'},
        ],
      },
      {type: 'bytes'},
    ],
    [
      {
        details: {
          token: permitSingle.details.token,
          amount: permitSingle.details.amount,
          expiration: permitSingle.details.expiration,
          nonce: permitSingle.details.nonce,
        },
        spender: permitSingle.spender,
        sigDeadline: permitSingle.sigDeadline,
      },
      signature,
    ],
  );
};

interface PermitData {
  permitSingle: PermitSingle;
  signature: Hex;
}

const encodeSwapExactInSingle = (
  poolKey: PoolKey,
  zeroForOne: boolean,
  amountIn: bigint,
  amountOutMinimum: bigint,
  recipient: Address,
  hookData: Hex = '0x',
  permitData?: PermitData,
) => {
  validateUint128(amountIn, 'amountIn');
  validateUint128(amountOutMinimum, 'amountOutMinimum');

  const {tokenIn, tokenOut} = getTokens(poolKey, zeroForOne);

  // If permit data provided, prepend PERMIT2_PERMIT command
  const commands = permitData
    ? concat([toHex(Commands.PERMIT2_PERMIT), toHex(Commands.V4_SWAP)])
    : toHex(Commands.V4_SWAP);

  const actions = concat([
    toHex(Actions.SWAP_EXACT_IN_SINGLE),
    toHex(Actions.SETTLE_ALL),
    toHex(Actions.TAKE_ALL),
  ]);
  const params = [
    encodeAbiParameters(SWAP_EXACT_IN_SINGLE_ABI, [
      {
        poolKey,
        zeroForOne,
        amountIn,
        amountOutMinimum,
        hookData,
      },
    ]),
    encodeSettleAll(tokenIn, amountIn),
    encodeTakeAll(tokenOut, amountOutMinimum),
  ];
  const swapInput = encodeAbiParameters(V4_SWAP_ABI, [actions, params]);

  // If permit data provided, include it as first input
  const inputs = permitData
    ? [
        encodePermit2Permit(permitData.permitSingle, permitData.signature),
        swapInput,
      ]
    : [swapInput];

  return {commands, inputs};
};

const encodeSwapExactOutSingle = (
  poolKey: PoolKey,
  zeroForOne: boolean,
  amountOut: bigint,
  amountInMaximum: bigint,
  recipient: Address,
  hookData: Hex = '0x',
  permitData?: PermitData,
) => {
  validateUint128(amountOut, 'amountOut');
  validateUint128(amountInMaximum, 'amountInMaximum');

  const {tokenIn, tokenOut} = getTokens(poolKey, zeroForOne);

  // If permit data provided, prepend PERMIT2_PERMIT command
  const commands = permitData
    ? concat([toHex(Commands.PERMIT2_PERMIT), toHex(Commands.V4_SWAP)])
    : toHex(Commands.V4_SWAP);

  const actions = concat([
    toHex(Actions.SWAP_EXACT_OUT_SINGLE),
    toHex(Actions.SETTLE_ALL),
    toHex(Actions.TAKE_ALL),
  ]);
  const params = [
    encodeAbiParameters(SWAP_EXACT_OUT_SINGLE_ABI, [
      {
        poolKey,
        zeroForOne,
        amountOut,
        amountInMaximum,
        hookData,
      },
    ]),
    encodeSettleAll(tokenIn, amountInMaximum),
    encodeTakeAll(tokenOut, amountOut),
  ];
  const swapInput = encodeAbiParameters(V4_SWAP_ABI, [actions, params]);

  // If permit data provided, include it as first input
  const inputs = permitData
    ? [
        encodePermit2Permit(permitData.permitSingle, permitData.signature),
        swapInput,
      ]
    : [swapInput];

  return {commands, inputs};
};

export const useSwap = () => {
  const {address} = useConnection();
  const publicClient = usePublicClient();

  const {mutateAsync: writeContractAsync} = useWriteContract();
  const {signPermitSingle, needsErc20Approval, needsPermit2Signature} =
    usePermit2();

  const [isPending, setIsPending] = useState(false);

  // Ensure ERC20 approval to Permit2 (one-time per token)
  const ensureErc20Approval = async (token: Address, amount: bigint) => {
    if (!publicClient || !address) throw new Error('Not connected');

    if (await needsErc20Approval(token, amount)) {
      toast.info('Approving token for Permit2...');
      const hash = await writeContractAsync({
        address: token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [PERMIT2_ADDRESS, maxUint160],
      });
      await publicClient.waitForTransactionReceipt({hash});
      toast.success('Token approved for Permit2');
    }
  };

  // Get permit signature if needed, returns undefined if allowance is sufficient
  const getPermitSignatureIfNeeded = async (
    token: Address,
    amount: bigint,
  ): Promise<PermitData | undefined> => {
    if (!address) throw new Error('Not connected');

    const needsSignature = await needsPermit2Signature(
      token,
      UNIVERSAL_ROUTER,
      amount,
    );

    if (!needsSignature) {
      return undefined;
    }

    toast.info('Requesting permit signature...');
    const {permitSingle, signature} = await signPermitSingle(
      token,
      UNIVERSAL_ROUTER,
      maxUint160, // Max amount for flexibility
      Number(maxUint48), // Max expiration
    );

    return {permitSingle, signature};
  };

  const simulateSwap = async (
    commands: Hex,
    inputs: Hex[],
    deadline: bigint,
  ) => {
    if (!publicClient || !address) throw new Error('Not connected');

    toast.info('Simulating swap...');
    try {
      await publicClient.simulateContract({
        address: UNIVERSAL_ROUTER,
        abi: universalRouterAbi,
        functionName: 'execute',
        args: [commands, inputs, deadline],
        account: address,
      });
    } catch (err: unknown) {
      const error = err as Error & {
        cause?: {shortMessage?: string};
        shortMessage?: string;
      };
      const msg =
        error.cause?.shortMessage || error.shortMessage || error.message;

      toast.error('Simulation failed', {description: msg});
      throw err;
    }
  };

  const executeSwap = async (
    commands: Hex,
    inputs: Hex[],
    deadline: bigint,
  ) => {
    if (!publicClient || !address) throw new Error('Not connected');

    toast.info('Signing transaction...');

    const hash = await writeContractAsync({
      address: UNIVERSAL_ROUTER,
      abi: universalRouterAbi,
      functionName: 'execute',
      args: [commands, inputs, deadline],
    });
    toast.info('Waiting for confirmation...', {
      description: `Tx: ${hash.slice(0, 10)}...`,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000,
    });
    return receipt;
  };

  const swapExactInSingle = useCallback(
    async (
      poolKey: PoolKey,
      amountIn: bigint,
      minAmountOut: bigint,
      zeroForOne: boolean,
      deadline: bigint,
    ) => {
      if (!address) throw new Error('Not connected');
      setIsPending(true);

      try {
        const {tokenIn} = getTokens(poolKey, zeroForOne);

        // Step 1: Ensure ERC20 approval to Permit2 (one-time tx)
        await ensureErc20Approval(tokenIn, amountIn);

        // Step 2: Get permit signature if needed (gasless signature)
        const permitData = await getPermitSignatureIfNeeded(tokenIn, amountIn);

        // Step 3: Encode swap with optional permit, recipient is the user's address
        const {commands, inputs} = encodeSwapExactInSingle(
          poolKey,
          zeroForOne,
          amountIn,
          minAmountOut,
          address,
          '0x',
          permitData,
        );

        await simulateSwap(commands, inputs, deadline);
        return await executeSwap(commands, inputs, deadline);
      } finally {
        setIsPending(false);
      }
    },
    [
      address,
      publicClient,
      signPermitSingle,
      needsErc20Approval,
      needsPermit2Signature,
    ],
  );

  const swapExactOutSingle = useCallback(
    async (
      poolKey: PoolKey,
      amountOut: bigint,
      maxAmountIn: bigint,
      zeroForOne: boolean,
      deadline: bigint,
    ) => {
      if (!address) throw new Error('Not connected');
      setIsPending(true);

      try {
        const {tokenIn} = getTokens(poolKey, zeroForOne);

        // Step 1: Ensure ERC20 approval to Permit2 (one-time tx)
        await ensureErc20Approval(tokenIn, maxAmountIn);

        // Step 2: Get permit signature if needed (gasless signature)
        const permitData = await getPermitSignatureIfNeeded(
          tokenIn,
          maxAmountIn,
        );

        // Step 3: Encode swap with optional permit, recipient is the user's address
        const {commands, inputs} = encodeSwapExactOutSingle(
          poolKey,
          zeroForOne,
          amountOut,
          maxAmountIn,
          address,
          '0x',
          permitData,
        );

        await simulateSwap(commands, inputs, deadline);
        return await executeSwap(commands, inputs, deadline);
      } finally {
        setIsPending(false);
      }
    },
    [
      address,
      publicClient,
      signPermitSingle,
      needsErc20Approval,
      needsPermit2Signature,
    ],
  );

  return {swapExactInSingle, swapExactOutSingle, isPending};
};
