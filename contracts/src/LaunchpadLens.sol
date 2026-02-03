// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IContinuousClearingAuction} from "continuous-clearing-auction/src/interfaces/IContinuousClearingAuction.sol";
import {Bid} from "continuous-clearing-auction/src/libraries/BidLib.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";
import {ILBPStrategyBase} from "liquidity-launcher/src/interfaces/ILBPStrategyBase.sol";
import {IImmutableState} from "@uniswap/v4-periphery/src/interfaces/IImmutableState.sol";

contract LaunchpadLens {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    struct AuctionState {
        uint256 clearingPriceQ96;
        uint256 currencyRaised;
        uint256 totalBidAmount;
        uint256 totalCleared;
        uint64 startBlock;
        uint64 endBlock;
        uint64 claimBlock;
        uint256 floorPriceQ96;
        uint256 tickSpacingQ96;
        address token;
        address currency;
        uint128 totalSupply;
        uint8 tokenDecimals;
        uint8 currencyDecimals;
        uint8 status; // 0: not_started, 1: active, 2: ended, 3: claimable
        uint8 progress;
    }

    struct TokenData {
        string name;
        string symbol;
        uint8 decimals;
        uint256 totalSupply;
    }

    struct PoolKeyWithStatus {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
        bool isMigrated;
    }

    struct StrategyState {
        // Pool key fields
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
        bool isMigrated;
        // Strategy fields
        address token;
        address currency;
        uint64 migrationBlock;
        address initializer;
        address poolManager;
    }

    function getAuctionState(
        address auction
    ) external view returns (AuctionState memory state) {
        IContinuousClearingAuction cca = IContinuousClearingAuction(auction);

        state.clearingPriceQ96 = cca.clearingPrice();
        state.currencyRaised = cca.currencyRaised();
        state.totalCleared = cca.totalCleared();
        state.startBlock = cca.startBlock();
        state.endBlock = cca.endBlock();
        state.claimBlock = cca.claimBlock();
        state.floorPriceQ96 = cca.floorPrice();
        state.tickSpacingQ96 = cca.tickSpacing();
        state.token = cca.token();
        state.currency = cca.currency();
        state.totalSupply = cca.totalSupply();

        // Get token decimals
        if (state.token != address(0)) {
            state.tokenDecimals = IERC20Metadata(state.token).decimals();
        } else {
            state.tokenDecimals = 18;
        }

        // Get currency decimals and balance
        if (state.currency == address(0)) {
            state.currencyDecimals = 18;
            state.totalBidAmount = auction.balance;
        } else {
            state.currencyDecimals = IERC20Metadata(state.currency).decimals();
            state.totalBidAmount = IERC20Metadata(state.currency).balanceOf(
                auction
            );
        }

        // Calculate status
        uint64 currentBlock = uint64(block.number);
        if (currentBlock < state.startBlock) {
            state.status = 0; // not_started
            state.progress = 0;
        } else if (currentBlock < state.endBlock) {
            state.status = 1; // active
            uint64 totalBlocks = state.endBlock - state.startBlock;
            uint64 elapsedBlocks = currentBlock - state.startBlock;
            state.progress = uint8((elapsedBlocks * 100) / totalBlocks);
        } else if (currentBlock < state.claimBlock) {
            state.status = 2; // ended
            state.progress = 100;
        } else {
            state.status = 3; // claimable
            state.progress = 100;
        }
    }

    function getTokenData(
        address token
    ) external view returns (TokenData memory data) {
        IERC20Metadata erc20 = IERC20Metadata(token);
        data.name = erc20.name();
        data.symbol = erc20.symbol();
        data.decimals = erc20.decimals();
        data.totalSupply = erc20.totalSupply();
    }

    struct BidWithId {
        uint256 id;
        uint64 startBlock;
        uint24 startCumulativeMps;
        uint64 exitedBlock;
        uint256 maxPrice;
        address owner;
        uint256 amountQ96;
        uint256 tokensFilled;
    }

    function getBids(
        address auction,
        uint256[] calldata bidIds
    ) external view returns (BidWithId[] memory bids) {
        IContinuousClearingAuction cca = IContinuousClearingAuction(auction);
        bids = new BidWithId[](bidIds.length);

        for (uint256 i = 0; i < bidIds.length; i++) {
            Bid memory bidData = cca.bids(bidIds[i]);
            bids[i] = BidWithId({
                id: bidIds[i],
                startBlock: bidData.startBlock,
                startCumulativeMps: bidData.startCumulativeMps,
                exitedBlock: bidData.exitedBlock,
                maxPrice: bidData.maxPrice,
                owner: bidData.owner,
                amountQ96: bidData.amountQ96,
                tokensFilled: bidData.tokensFilled
            });
        }
    }

    function getPoolKeyAndMigrationStatus(
        address strategy
    ) external view returns (PoolKeyWithStatus memory result) {
        ILBPStrategyBase strat = ILBPStrategyBase(strategy);
        IPoolManager poolManager = IImmutableState(strategy).poolManager();

        address tokenAddr = strat.token();
        address currencyAddr = strat.currency();
        uint24 fee = strat.poolLPFee();
        int24 tickSpacing = strat.poolTickSpacing();

        // Sort addresses for currency0/currency1 (V4 requires currency0 < currency1)
        (address currency0, address currency1) = tokenAddr < currencyAddr
            ? (tokenAddr, currencyAddr)
            : (currencyAddr, tokenAddr);

        result.currency0 = currency0;
        result.currency1 = currency1;
        result.fee = fee;
        result.tickSpacing = tickSpacing;
        result.hooks = strategy;

        // Build PoolKey to compute pool ID
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(currency0),
            currency1: Currency.wrap(currency1),
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(strategy)
        });

        // Check if pool is initialized by reading sqrtPriceX96 from slot0
        PoolId poolId = key.toId();
        (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(poolId);
        result.isMigrated = sqrtPriceX96 != 0;
    }

    function getStrategyState(
        address strategy
    ) external view returns (StrategyState memory result) {
        ILBPStrategyBase strat = ILBPStrategyBase(strategy);
        IPoolManager poolManager = IImmutableState(strategy).poolManager();

        result.token = strat.token();
        result.currency = strat.currency();
        result.fee = strat.poolLPFee();
        result.tickSpacing = strat.poolTickSpacing();
        result.migrationBlock = strat.migrationBlock();
        result.initializer = address(strat.initializer());
        result.poolManager = address(poolManager);

        // Sort addresses for currency0/currency1 (V4 requires currency0 < currency1)
        (result.currency0, result.currency1) = result.token < result.currency
            ? (result.token, result.currency)
            : (result.currency, result.token);

        result.hooks = strategy;

        // Build PoolKey to compute pool ID
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(result.currency0),
            currency1: Currency.wrap(result.currency1),
            fee: result.fee,
            tickSpacing: result.tickSpacing,
            hooks: IHooks(strategy)
        });

        // Check if pool is initialized by reading sqrtPriceX96 from slot0
        PoolId poolId = key.toId();
        (uint160 sqrtPriceX96, , , ) = poolManager.getSlot0(poolId);
        result.isMigrated = sqrtPriceX96 != 0;
    }

    struct PoolPrice {
        int24 tick;
        uint160 sqrtPriceX96;
        uint256 priceE18;
    }

    function getPoolPrice(
        IPoolManager poolManager,
        PoolKey calldata poolKey
    ) external view returns (PoolPrice memory result) {
        PoolId poolId = poolKey.toId();
        (uint160 sqrtPriceX96, int24 tick, , ) = poolManager.getSlot0(poolId);

        result.tick = tick;
        result.sqrtPriceX96 = sqrtPriceX96;

        // Convert sqrtPriceX96 to price scaled by 1e18
        // sqrtPriceX96 = sqrt(price) * 2^96
        // price = (sqrtPriceX96 / 2^96)^2
        // priceE18 = price * 1e18 = (sqrtPriceX96^2 * 1e18) / 2^192
        if (sqrtPriceX96 <= type(uint128).max) {
            uint256 priceX192 = uint256(sqrtPriceX96) * sqrtPriceX96;
            result.priceE18 = FullMath.mulDiv(priceX192, 1e18, 1 << 192);
        } else {
            uint256 priceX128 = FullMath.mulDiv(
                sqrtPriceX96,
                sqrtPriceX96,
                1 << 64
            );
            result.priceE18 = FullMath.mulDiv(priceX128, 1e18, 1 << 128);
        }
    }
}
