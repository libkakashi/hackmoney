// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {ILBPStrategyBase} from "liquidity-launcher/src/interfaces/ILBPStrategyBase.sol";
import {IStrategyFactory} from "liquidity-launcher/src/interfaces/IStrategyFactory.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {IUERC20Factory} from "uerc20-factory/interfaces/IUERC20Factory.sol";

import {AuctionParameters, IContinuousClearingAuction} from "continuous-clearing-auction/src/interfaces/IContinuousClearingAuction.sol";
import {MigratorParameters} from "liquidity-launcher/src/types/MigratorParameters.sol";

import {UERC20Metadata} from "uerc20-factory/libraries/UERC20MetadataLibrary.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";

import {Launchpad} from "src/Launchpad.sol";

contract LaunchpadTestScript is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    // Hook permission flags from Hooks.sol
    uint160 constant ALL_HOOK_MASK = uint160((1 << 14) - 1); // 0x3FFF
    uint160 constant BEFORE_INITIALIZE_FLAG = 1 << 13; // 0x2000

    // The strategy only implements beforeInitialize, so we need EXACTLY this flag set
    uint160 constant REQUIRED_FLAGS = BEFORE_INITIALIZE_FLAG;

    // Permit2 canonical address (same on all chains)
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    // USDC whale address on mainnet (Circle's address with lots of USDC)
    address constant USDC_WHALE = 0x55FE002aefF02F77364de339a1292923A15844B8;

    struct MineParams {
        address tokenFactory;
        address strategyFactory;
        address launchpad;
        address ccaFactory;
        address caller;
        address currency;
        string name;
        string symbol;
    }

    /// @notice Mine a salt that produces a valid hook address for the strategy
    function mineSalt(
        MineParams memory params
    ) internal view returns (bytes32, address) {
        // Get constants from launchpad
        Launchpad launchpad = Launchpad(params.launchpad);

        // Get strategy config from launchpad helper
        (
            MigratorParameters memory migratorParams,
            bytes memory auctionParamsEncoded,
            ,
            ,
            ,
            ,
            ,

        ) = launchpad.getStrategyConfig(uint64(block.number));

        // Build strategy config
        bytes memory strategyConfig = abi.encode(
            migratorParams,
            auctionParamsEncoded
        );

        for (uint256 i = 0; i < 500000; i++) {
            bytes32 userSalt = bytes32(i);

            // Predict token address
            address predictedToken = IUERC20Factory(params.tokenFactory)
                .getUERC20Address(
                    params.name,
                    params.symbol,
                    launchpad.TOKEN_DECIMALS(),
                    params.launchpad,
                    keccak256(abi.encode(params.caller, userSalt))
                );

            // Get predicted strategy address
            address predictedStrategy = IStrategyFactory(params.strategyFactory)
                .getAddress(
                    predictedToken,
                    launchpad.TOTAL_SUPPLY(),
                    strategyConfig,
                    userSalt, // strategySalt - not hashed, StrategyFactory hashes internally
                    params.launchpad
                );

            // Check if address has EXACTLY the beforeInitialize flag set
            if (uint160(predictedStrategy) & ALL_HOOK_MASK == REQUIRED_FLAGS) {
                console.log("Found valid salt at iteration:", i);
                console.log("Predicted token address:", predictedToken);
                console.log("Predicted strategy address:", predictedStrategy);
                return (userSalt, predictedToken);
            }
        }
        revert("Could not find valid salt in 500000 iterations");
    }

    function run() external {
        // Replace these with your deployed factory addresses
        address launchpadAddr = 0x3B5ef7D1Aae78a0314c5019e1485c126BAB2f92E;
        Launchpad launchpad = Launchpad(launchpadAddr);

        address strategyFactory = launchpad.STRATEGY_FACTORY();
        address tokenFactory = launchpad.TOKEN_FACTORY();
        address ccaFactory = launchpad.CCA_FACTORY();
        address currency = launchpad.CURRENCY();

        console.log("Launchpad:", launchpadAddr);
        console.log("Strategy factory:", strategyFactory);
        console.log("Token factory:", tokenFactory);
        console.log("CCA factory:", ccaFactory);
        console.log("Currency:", currency);

        // Token params
        string memory name = "token";
        string memory symbol = "TOKEN";

        // Token metadata
        UERC20Metadata memory metadata = UERC20Metadata({
            description: "A test token launched via CCA auction",
            website: "https://example.com",
            image: "https://example.com/token-logo.png"
        });

        // Get the caller address
        address caller = msg.sender;
        console.log("Caller (msg.sender for launch):", caller);

        console.log("Mining valid salt for hook address...");
        (bytes32 salt, address predictedToken) = mineSalt(
            MineParams({
                tokenFactory: tokenFactory,
                strategyFactory: strategyFactory,
                launchpad: launchpadAddr,
                ccaFactory: ccaFactory,
                caller: caller,
                currency: currency,
                name: name,
                symbol: symbol
            })
        );
        console.log("Mined salt:");
        console.logBytes32(salt);

        // Build token params
        Launchpad.TokenParams memory tokenParams = Launchpad.TokenParams({
            name: name,
            symbol: symbol,
            metadata: metadata
        });

        vm.startBroadcast();

        // Launch the token with the mined salt
        (address token, address strategy, address auction) = launchpad.launch(
            tokenParams,
            uint64(block.number),
            salt
        );

        console.log("Token:", token);
        console.log("Strategy:", strategy);
        console.log("Auction:", auction);

        // Verify prediction was correct
        require(token == predictedToken, "Token address mismatch!");

        // ============ Submit Bids ============
        console.log("\n--- Submitting Bids ---");

        IContinuousClearingAuction auctionContract = IContinuousClearingAuction(
            auction
        );

        // Get auction parameters
        uint256 floorPrice = auctionContract.floorPrice();
        uint256 auctionTickSpacing = auctionContract.tickSpacing();
        uint256 currentClearingPrice = auctionContract.clearingPrice();
        uint64 startBlock = auctionContract.startBlock();
        uint64 endBlock = auctionContract.endBlock();
        uint64 claimBlock = auctionContract.claimBlock();

        console.log("Floor price:", floorPrice);
        console.log("Tick spacing:", auctionTickSpacing);
        console.log("Current clearing price:", currentClearingPrice);
        console.log("Auction start block:", startBlock);
        console.log("Auction end block:", endBlock);
        console.log("Claim block:", claimBlock);
        console.log("Current block:", block.number);

        // Calculate valid bid prices (must be above clearing price, at valid ticks)
        uint256 maxPrice1 = floorPrice + auctionTickSpacing;
        uint256 maxPrice2 = floorPrice + (auctionTickSpacing * 2);
        uint256 maxPrice3 = floorPrice + (auctionTickSpacing * 3);

        // For USDC (6 decimals), use appropriate amounts
        // Bid amounts - using 1000 USDC per bid (1000 * 1e6)
        uint128 bidAmount = 1000 * 1e6; // 1000 USDC

        console.log("Bid amount (per bid):", bidAmount);
        console.log("Max price 1:", maxPrice1);
        console.log("Max price 2:", maxPrice2);
        console.log("Max price 3:", maxPrice3);

        // Check if currency is ETH (address(0)) or ERC20
        if (currency == address(0)) {
            // Native ETH auction
            uint256 totalEthNeeded = uint256(bidAmount) * 3;
            vm.deal(caller, totalEthNeeded);
            console.log("Dealt ETH to caller:", totalEthNeeded);

            // Submit 3 bids at different prices
            uint256 bidId1 = auctionContract.submitBid{value: bidAmount}(
                maxPrice1,
                bidAmount,
                caller,
                bytes("")
            );
            console.log("Bid 1 submitted! Bid ID:", bidId1);

            uint256 bidId2 = auctionContract.submitBid{value: bidAmount}(
                maxPrice2,
                bidAmount,
                caller,
                maxPrice1,
                bytes("")
            );
            console.log("Bid 2 submitted! Bid ID:", bidId2);

            uint256 bidId3 = auctionContract.submitBid{value: bidAmount}(
                maxPrice3,
                bidAmount,
                caller,
                maxPrice2,
                bytes("")
            );
            console.log("Bid 3 submitted! Bid ID:", bidId3);
        } else {
            // ERC20 auction - transfer from whale instead of using deal()
            console.log("Submitting ERC20 bids via Permit2...");

            uint256 totalCurrencyNeeded = uint256(bidAmount) * 3;

            // Impersonate USDC whale and transfer tokens
            vm.stopBroadcast();
            vm.startPrank(USDC_WHALE);
            IERC20(currency).transfer(caller, totalCurrencyNeeded);
            vm.stopPrank();
            vm.startBroadcast();

            console.log(
                "Transferred currency from whale:",
                totalCurrencyNeeded
            );
            console.log(
                "Caller currency balance:",
                IERC20(currency).balanceOf(caller)
            );

            // Approve currency to Permit2
            IERC20(currency).approve(PERMIT2, type(uint256).max);
            console.log("Approved currency to Permit2");

            // Approve Permit2 to allow auction to spend
            IAllowanceTransfer(PERMIT2).approve(
                currency,
                auction,
                type(uint160).max,
                uint48(block.timestamp + 86400) // 24 hour expiration
            );
            console.log("Approved Permit2 allowance for auction");

            // Submit 3 bids at different prices
            uint256 bidId1 = auctionContract.submitBid(
                maxPrice1,
                bidAmount,
                caller,
                bytes("")
            );
            console.log("Bid 1 submitted! Bid ID:", bidId1);

            uint256 bidId2 = auctionContract.submitBid(
                maxPrice2,
                bidAmount,
                caller,
                maxPrice1,
                bytes("")
            );
            console.log("Bid 2 submitted! Bid ID:", bidId2);

            uint256 bidId3 = auctionContract.submitBid(
                maxPrice3,
                bidAmount,
                caller,
                maxPrice2,
                bytes("")
            );
            console.log("Bid 3 submitted! Bid ID:", bidId3);
        }

        // Log auction state after bids
        console.log("\n--- Auction State After Bids ---");
        console.log("Clearing price:", auctionContract.clearingPrice());
        console.log("Currency raised:", auctionContract.currencyRaised());
        console.log("Next bid ID:", auctionContract.nextBidId());
        console.log("Is graduated:", auctionContract.isGraduated());

        vm.stopBroadcast();

        console.log("\n--- Next Steps ---");
        console.log("1. Fast forward to end block:", endBlock);
        console.log("   Run: cast rpc anvil_mine", endBlock - block.number);
        console.log(
            "2. Then run the claim script to exit bids and claim tokens"
        );
    }
}

/// @notice Separate script for claiming after auction ends
contract ClaimScript is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    function run() external {
        // These should match the auction from LaunchpadTestScript
        address auctionAddr = vm.envAddress("AUCTION");
        address strategyAddr = vm.envAddress("STRATEGY");
        address caller = msg.sender;

        console.log("Auction:", auctionAddr);
        console.log("Strategy:", strategyAddr);
        console.log("Caller:", caller);

        IContinuousClearingAuction auction = IContinuousClearingAuction(
            auctionAddr
        );
        ILBPStrategyBase strategy = ILBPStrategyBase(strategyAddr);

        console.log("\n--- Auction Final State ---");
        console.log("Current block:", block.number);
        console.log("End block:", auction.endBlock());
        console.log("Claim block:", auction.claimBlock());
        console.log("Clearing price:", auction.clearingPrice());
        console.log("Currency raised:", auction.currencyRaised());
        console.log("Total cleared:", auction.totalCleared());
        console.log("Is graduated:", auction.isGraduated());

        // Check if auction has ended
        require(block.number >= auction.endBlock(), "Auction not ended yet");

        vm.startBroadcast();

        // Checkpoint the auction to finalize state
        console.log("\n--- Checkpointing Auction ---");
        auction.checkpoint();
        console.log("Checkpoint complete");
        console.log("Final clearing price:", auction.clearingPrice());
        console.log("Is graduated:", auction.isGraduated());

        if (auction.isGraduated()) {
            // Exit bids (this calculates tokens filled and refunds)
            console.log("\n--- Exiting Bids ---");
            uint256 nextBidId = auction.nextBidId();
            for (uint256 i = 0; i < nextBidId; i++) {
                try auction.exitBid(i) {
                    console.log("Exited bid:", i);
                } catch {
                    console.log(
                        "Could not exit bid (may need partial exit):",
                        i
                    );
                }
            }

            // Wait for claim block if needed
            if (block.number >= auction.claimBlock()) {
                console.log("\n--- Claiming Tokens ---");
                for (uint256 i = 0; i < nextBidId; i++) {
                    try auction.claimTokens(i) {
                        console.log("Claimed tokens for bid:", i);
                    } catch {
                        console.log("Could not claim tokens for bid:", i);
                    }
                }
            } else {
                console.log(
                    "\nClaim block not reached yet. Current:",
                    block.number
                );
                console.log("Claim block:", auction.claimBlock());
            }

            // Check migration status
            console.log("\n--- Migration Status ---");
            console.log("Migration block:", strategy.migrationBlock());

            if (block.number >= strategy.migrationBlock()) {
                console.log("Migration block reached, attempting migration...");
                try strategy.migrate() {
                    console.log("Migration successful!");

                    // Get pool info
                    // Note: You'd need to get the pool key from the strategy to query pool state
                    console.log("\n--- Pool Created ---");
                    console.log("Check the strategy for pool details");
                } catch Error(string memory reason) {
                    console.log("Migration failed:", reason);
                } catch {
                    console.log("Migration failed with unknown error");
                }
            } else {
                console.log("Migration block not reached yet");
                console.log("Current block:", block.number);
                console.log("Migration block:", strategy.migrationBlock());
            }
        } else {
            console.log(
                "\nAuction did not graduate. Bids will be fully refunded."
            );
            // Exit bids for full refund
            uint256 nextBidId = auction.nextBidId();
            for (uint256 i = 0; i < nextBidId; i++) {
                try auction.exitBid(i) {
                    console.log("Refunded bid:", i);
                } catch {
                    console.log("Could not refund bid:", i);
                }
            }
        }

        // Log final token balances
        console.log("\n--- Final Balances ---");
        address tokenAddr = auction.token();
        console.log(
            "Caller token balance:",
            IERC20(tokenAddr).balanceOf(caller)
        );

        vm.stopBroadcast();
    }
}
