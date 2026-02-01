import assert from "assert";
import { 
  TestHelpers,
  Launchpad_TokenLaunched
} from "generated";
const { MockDb, Launchpad } = TestHelpers;

describe("Launchpad contract TokenLaunched event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Launchpad contract TokenLaunched event
  const event = Launchpad.TokenLaunched.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("Launchpad_TokenLaunched is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Launchpad.TokenLaunched.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualLaunchpadTokenLaunched = mockDbUpdated.entities.Launchpad_TokenLaunched.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedLaunchpadTokenLaunched: Launchpad_TokenLaunched = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      token: event.params.token,
      strategy: event.params.strategy,
      auction: event.params.auction,
      creator: event.params.creator,
      name: event.params.name,
      symbol: event.params.symbol,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualLaunchpadTokenLaunched, expectedLaunchpadTokenLaunched, "Actual LaunchpadTokenLaunched should be the same as the expectedLaunchpadTokenLaunched");
  });
});
