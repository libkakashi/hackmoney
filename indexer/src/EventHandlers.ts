/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Launchpad,
  Launchpad_TokenLaunched,
  Token,
  Token_Transfer,
  TokenHolder,
} from 'generated';

Launchpad.TokenLaunched.contractRegister(
  async ({event, context: contractRegistrations}) => {
    contractRegistrations.addToken(event.params.token);
  },
);

Launchpad.TokenLaunched.handler(async ({event, context}) => {
  const entity: Launchpad_TokenLaunched = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    address: event.params.token,
    creator: event.params.creator,
    name: event.params.name,
    symbol: event.params.symbol,
    createdAt: event.block.timestamp,
    createdAtBlock: BigInt(event.block.number),
    txHash: event.transaction.hash,
  };

  context.Launchpad_TokenLaunched.set(entity);
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

Token.Transfer.handler(async ({event, context}) => {
  const token = event.srcAddress.toLowerCase();
  const from = event.params.from.toLowerCase();
  const to = event.params.to.toLowerCase();
  const amount = event.params.value;

  // Store the transfer event
  const transfer: Token_Transfer = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    token,
    from,
    to,
    amount,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  };
  context.Token_Transfer.set(transfer);

  // Update sender (skip zero address for mints)
  if (from !== ZERO_ADDRESS) {
    const fromId = `${token}_${from}`;
    const existing = await context.TokenHolder.get(fromId);

    const holder: TokenHolder = {
      id: fromId,
      token,
      wallet: from,
      balance: (existing?.balance ?? BigInt(0)) - amount,
      totalSent: (existing?.totalSent ?? BigInt(0)) + amount,
      totalReceived: existing?.totalReceived ?? BigInt(0),
      transferCount: (existing?.transferCount ?? 0) + 1,
      lastUpdatedAt: event.block.timestamp,
    };
    context.TokenHolder.set(holder);
  }

  // Update receiver (skip zero address for burns)
  if (to !== ZERO_ADDRESS) {
    const toId = `${token}_${to}`;
    const existing = await context.TokenHolder.get(toId);

    const holder: TokenHolder = {
      id: toId,
      token,
      wallet: to,
      balance: (existing?.balance ?? BigInt(0)) + amount,
      totalSent: existing?.totalSent ?? BigInt(0),
      totalReceived: (existing?.totalReceived ?? BigInt(0)) + amount,
      transferCount: (existing?.transferCount ?? 0) + 1,
      lastUpdatedAt: event.block.timestamp,
    };
    context.TokenHolder.set(holder);
  }
});
