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

/**
 * Parses the description to extract social URLs.
 * Expected format: "Description text \n\n ["twitterUrl", "discordUrl", "telegramUrl"]"
 */
function parseMetadata(description: string): {
  cleanDescription: string;
  twitterUrl: string | undefined;
  discordUrl: string | undefined;
  telegramUrl: string | undefined;
} {
  const parts = description.split('\n\n');

  if (parts.length < 2) {
    return {
      cleanDescription: description,
      twitterUrl: undefined,
      discordUrl: undefined,
      telegramUrl: undefined,
    };
  }

  const lastPart = parts[parts.length - 1].trim();

  try {
    const parsed = JSON.parse(lastPart);
    if (Array.isArray(parsed) && (parsed.length === 3 || parsed.length === 4)) {
      const cleanDescription = parts.slice(0, -1).join('\n\n');
      return {
        cleanDescription,
        twitterUrl: parsed[0] || undefined,
        discordUrl: parsed[1] || undefined,
        telegramUrl: parsed[2] || undefined,
      };
    }
  } catch {
    // Not valid JSON, return original description
  }

  return {
    cleanDescription: description,
    twitterUrl: undefined,
    discordUrl: undefined,
    telegramUrl: undefined,
  };
}

Launchpad.TokenLaunched.contractRegister(
  async ({event, context: contractRegistrations}) => {
    contractRegistrations.addToken(event.params.token);
  },
);

Launchpad.TokenLaunched.handler(async ({event, context}) => {
  const {cleanDescription, twitterUrl, discordUrl, telegramUrl} =
    parseMetadata(event.params.description);

  const entity: Launchpad_TokenLaunched = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    address: event.params.token,
    strategy: event.params.strategy,
    auction: event.params.auction,
    creator: event.params.creator,
    name: event.params.name,
    symbol: event.params.symbol,
    description: cleanDescription,
    website: event.params.website || undefined,
    twitterUrl,
    discordUrl,
    telegramUrl,
    image: event.params.image,
    auctionStartBlock: event.params.auctionStartBlock,
    auctionEndBlock: event.params.auctionEndBlock,
    auctionClaimBlock: event.params.auctionClaimBlock,
    poolMigrationBlock: event.params.poolMigrationBlock,
    salt: event.params.salt,
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
