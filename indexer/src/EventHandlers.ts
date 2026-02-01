/*
 * Please refer to https://docs.envio.dev for a thorough guide on all Envio indexer features
 */
import {
  Launchpad,
  Launchpad_TokenLaunched,
} from "generated";

Launchpad.TokenLaunched.handler(async ({ event, context }) => {
  const entity: Launchpad_TokenLaunched = {
    id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
    token: event.params.token,
    strategy: event.params.strategy,
    auction: event.params.auction,
    creator: event.params.creator,
    name: event.params.name,
    symbol: event.params.symbol,
  };

  context.Launchpad_TokenLaunched.set(entity);
});
