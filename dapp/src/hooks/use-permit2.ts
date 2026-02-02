import {useCallback} from 'react';
import {useSignTypedData, usePublicClient, useConnection} from 'wagmi';
import {type Address, type Hex, erc20Abi, maxUint160, maxUint48} from 'viem';
import {permit2Abi} from '~/abi/permit2';

// Permit2 canonical address (same on all chains)
export const PERMIT2_ADDRESS =
  '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;

// EIP-712 types for PermitSingle (AllowanceTransfer)
const PERMIT_TYPES = {
  PermitSingle: [
    {name: 'details', type: 'PermitDetails'},
    {name: 'spender', type: 'address'},
    {name: 'sigDeadline', type: 'uint256'},
  ],
  PermitDetails: [
    {name: 'token', type: 'address'},
    {name: 'amount', type: 'uint160'},
    {name: 'expiration', type: 'uint48'},
    {name: 'nonce', type: 'uint48'},
  ],
} as const;

// EIP-712 types for SignatureTransfer (PermitTransferFrom)
const PERMIT_TRANSFER_FROM_TYPES = {
  PermitTransferFrom: [
    {name: 'permitted', type: 'TokenPermissions'},
    {name: 'spender', type: 'address'},
    {name: 'nonce', type: 'uint256'},
    {name: 'deadline', type: 'uint256'},
  ],
  TokenPermissions: [
    {name: 'token', type: 'address'},
    {name: 'amount', type: 'uint256'},
  ],
} as const;

export interface PermitDetails {
  token: Address;
  amount: bigint;
  expiration: number;
  nonce: number;
}

export interface PermitSingle {
  details: PermitDetails;
  spender: Address;
  sigDeadline: bigint;
}

export interface Permit2Signature {
  permitSingle: PermitSingle;
  signature: Hex;
}

// SignatureTransfer types (for permitTransferFrom)
export interface TokenPermissions {
  token: Address;
  amount: bigint;
}

export interface PermitTransferFrom {
  permitted: TokenPermissions;
  spender: Address;
  nonce: bigint;
  deadline: bigint;
}

export interface SignatureTransferSignature {
  permit: PermitTransferFrom;
  signature: Hex;
}

export const usePermit2 = () => {
  const {address, chainId} = useConnection();
  const publicClient = usePublicClient();
  const {mutateAsync: signTypedDataAsync} = useSignTypedData();

  // Check if token has been approved to Permit2
  const checkErc20Approval = useCallback(
    async (token: Address, amount: bigint): Promise<boolean> => {
      if (!publicClient || !address) return false;

      const allowance = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, PERMIT2_ADDRESS],
      });

      return allowance >= amount;
    },
    [publicClient, address],
  );

  // Check current Permit2 allowance for a spender
  const checkPermit2Allowance = useCallback(
    async (
      token: Address,
      spender: Address,
    ): Promise<{amount: bigint; expiration: number; nonce: number}> => {
      if (!publicClient || !address) {
        return {amount: 0n, expiration: 0, nonce: 0};
      }

      const [amount, expiration, nonce] = await publicClient.readContract({
        address: PERMIT2_ADDRESS,
        abi: permit2Abi,
        functionName: 'allowance',
        args: [address, token, spender],
      });

      return {amount, expiration, nonce};
    },
    [publicClient, address],
  );

  // Sign a PermitSingle for AllowanceTransfer
  const signPermitSingle = useCallback(
    async (
      token: Address,
      spender: Address,
      amount: bigint = maxUint160,
      expiration: number = Number(maxUint48), // Max expiration
      sigDeadline?: bigint,
    ): Promise<Permit2Signature> => {
      if (!address) throw new Error('Wallet not connected');
      if (!publicClient) throw new Error('Public client not available');
      if (!chainId) throw new Error('Chain ID not available');

      // Get current nonce for this token/spender
      const {nonce} = await checkPermit2Allowance(token, spender);

      // Default signature deadline to 30 minutes from now
      const deadline =
        sigDeadline ?? BigInt(Math.floor(Date.now() / 1000) + 30 * 60);

      const permitSingle: PermitSingle = {
        details: {
          token,
          amount,
          expiration,
          nonce,
        },
        spender,
        sigDeadline: deadline,
      };

      const signature = await signTypedDataAsync({
        domain: {
          name: 'Permit2',
          chainId,
          verifyingContract: PERMIT2_ADDRESS,
        },
        types: PERMIT_TYPES,
        primaryType: 'PermitSingle',
        message: {
          details: {
            token: permitSingle.details.token,
            amount: permitSingle.details.amount,
            expiration: permitSingle.details.expiration,
            nonce: permitSingle.details.nonce,
          },
          spender: permitSingle.spender,
          sigDeadline: permitSingle.sigDeadline,
        },
      });

      return {permitSingle, signature};
    },
    [address, chainId, publicClient, signTypedDataAsync, checkPermit2Allowance],
  );

  // Check if we need ERC20 approval to Permit2
  const needsErc20Approval = useCallback(
    async (token: Address, amount: bigint): Promise<boolean> => {
      return !(await checkErc20Approval(token, amount));
    },
    [checkErc20Approval],
  );

  // Check if we need a Permit2 signature (allowance expired or insufficient)
  const needsPermit2Signature = useCallback(
    async (
      token: Address,
      spender: Address,
      amount: bigint,
    ): Promise<boolean> => {
      const {amount: allowedAmount, expiration} = await checkPermit2Allowance(
        token,
        spender,
      );

      const now = Math.floor(Date.now() / 1000);
      return allowedAmount < amount || expiration < now;
    },
    [checkPermit2Allowance],
  );

  // Get an unused nonce for SignatureTransfer
  // SignatureTransfer uses a bitmap for nonces - each nonce can only be used once
  const getUnusedNonce = useCallback(async (): Promise<bigint> => {
    if (!publicClient || !address) throw new Error('Not connected');

    // Use current timestamp as a starting point for nonce
    // This gives us a unique nonce that's unlikely to collide
    const baseNonce = BigInt(Date.now());

    // Check if this nonce is used (check the bitmap)
    const wordPos = baseNonce >> 8n; // divide by 256
    const bitPos = baseNonce & 255n; // mod 256

    const bitmap = await publicClient.readContract({
      address: PERMIT2_ADDRESS,
      abi: permit2Abi,
      functionName: 'nonceBitmap',
      args: [address, wordPos],
    });

    // Check if bit is set (nonce used)
    const isUsed = (bitmap >> bitPos) & 1n;

    if (isUsed) {
      // If used, increment and try again (simplified - just add 1)
      return baseNonce + 1n;
    }

    return baseNonce;
  }, [publicClient, address]);

  // Sign a PermitTransferFrom for SignatureTransfer (single-use signature)
  // This is used by contracts that call Permit2.permitTransferFrom()
  const signPermitTransferFrom = useCallback(
    async (
      token: Address,
      spender: Address,
      amount: bigint,
      deadline?: bigint,
    ): Promise<SignatureTransferSignature> => {
      if (!address) throw new Error('Wallet not connected');
      if (!publicClient) throw new Error('Public client not available');
      if (!chainId) throw new Error('Chain ID not available');

      // Get an unused nonce
      const nonce = await getUnusedNonce();

      // Default deadline to 30 minutes from now
      const permitDeadline =
        deadline ?? BigInt(Math.floor(Date.now() / 1000) + 30 * 60);

      const permit: PermitTransferFrom = {
        permitted: {
          token,
          amount,
        },
        spender,
        nonce,
        deadline: permitDeadline,
      };

      console.log('[signPermitTransferFrom] Signing permit:', {
        token,
        amount: amount.toString(),
        spender,
        nonce: nonce.toString(),
        deadline: permitDeadline.toString(),
      });

      const signature = await signTypedDataAsync({
        domain: {
          name: 'Permit2',
          chainId,
          verifyingContract: PERMIT2_ADDRESS,
        },
        types: PERMIT_TRANSFER_FROM_TYPES,
        primaryType: 'PermitTransferFrom',
        message: {
          permitted: {
            token: permit.permitted.token,
            amount: permit.permitted.amount,
          },
          spender: permit.spender,
          nonce: permit.nonce,
          deadline: permit.deadline,
        },
      });

      console.log('[signPermitTransferFrom] Signature obtained');

      return {permit, signature};
    },
    [address, chainId, publicClient, signTypedDataAsync, getUnusedNonce],
  );

  return {
    signPermitSingle,
    signPermitTransferFrom,
    checkErc20Approval,
    checkPermit2Allowance,
    needsErc20Approval,
    needsPermit2Signature,
    getUnusedNonce,
    permit2Address: PERMIT2_ADDRESS,
  };
};
