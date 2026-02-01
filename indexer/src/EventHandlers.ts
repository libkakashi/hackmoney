/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {Launchpad, Launchpad_TokenLaunched} from 'generated';

/**
 * Parses the description to extract social URLs.
 * Expected format: "Description text \n\n ["twitterUrl", "discordUrl", "telegramUrl"]"
 */
function parseSocialUrls(description: string): {
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
    if (Array.isArray(parsed) && parsed.length === 3) {
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

Launchpad.TokenLaunched.handler(async ({event, context}) => {
  const {cleanDescription, twitterUrl, discordUrl, telegramUrl} =
    parseSocialUrls(event.params.description);

  const entity: Launchpad_TokenLaunched = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    token: event.params.token,
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
