// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuardTransient} from "openzeppelin-contracts/contracts/utils/ReentrancyGuardTransient.sol";

import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {LiquidityAmounts} from "v4-periphery/src/libraries/LiquidityAmounts.sol";
import {IAllowanceTransfer} from "v4-periphery/lib/permit2/src/interfaces/IAllowanceTransfer.sol";

import {LaunchToken} from "./LaunchToken.sol";

/// @title Launchpad
/// @notice Deploys ERC20 tokens with single-sided Uniswap V4 liquidity at a $0.10 floor price
contract Launchpad is ReentrancyGuardTransient {
    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event TokenLaunched(
        address indexed token,
        address indexed creator,
        string name,
        string symbol
    );

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Total supply for each launched token (1M with 18 decimals)
    uint128 public constant TOTAL_SUPPLY = 1_000_000 * 1e18;

    /// @notice LP fee for the V4 pool (1%)
    uint24 public constant POOL_LP_FEE = 10000;

    /// @notice Tick spacing for the V4 pool
    int24 public constant POOL_TICK_SPACING = 60;

    /// @notice Floor tick for $0.10 price (USDC 6 decimals / token 18 decimals)
    /// @dev tick = floor(log(sqrt(0.1 * 1e6 / 1e18)) / log(sqrt(1.0001))) = -299340
    ///      -299340 is divisible by 60, so already aligned to tick spacing
    int24 public constant FLOOR_TICK = -299340;

    /// @notice sqrtPriceX96 at FLOOR_TICK
    uint160 public constant FLOOR_SQRT_PRICE_X96 = 7931558425297600;

    /// @notice Canonical Permit2 address
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    /*//////////////////////////////////////////////////////////////
                               IMMUTABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Uniswap V4 PositionManager
    IPositionManager public immutable POSITION_MANAGER;

    /// @notice Uniswap V4 PoolManager
    IPoolManager public immutable POOL_MANAGER;

    /// @notice Quote currency for pools (e.g., USDC)
    address public immutable CURRENCY;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address positionManager, address poolManager, address currency) {
        POSITION_MANAGER = IPositionManager(positionManager);
        POOL_MANAGER = IPoolManager(poolManager);
        CURRENCY = currency;
    }

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Launch a new token with single-sided V4 liquidity
    /// @param name Token name
    /// @param symbol Token symbol
    /// @return token The deployed token address
    function launch(
        string calldata name,
        string calldata symbol
    ) external nonReentrant returns (address token) {
        // 1. Deploy token - all supply minted to this contract
        token = address(new LaunchToken(name, symbol, TOTAL_SUPPLY, address(this)));

        // 2. Sort token and currency for PoolKey (V4 requires currency0 < currency1)
        bool tokenIsCurrency0 = token < CURRENCY;
        (address currency0, address currency1) = tokenIsCurrency0
            ? (token, CURRENCY)
            : (CURRENCY, token);

        // 3. Build PoolKey (no hooks)
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(currency0),
            currency1: Currency.wrap(currency1),
            fee: POOL_LP_FEE,
            tickSpacing: POOL_TICK_SPACING,
            hooks: IHooks(address(0))
        });

        // 4. Calculate sqrtPriceX96 based on token sort order
        //    FLOOR_SQRT_PRICE_X96 represents price = USDC/token when token is currency0
        //    If token is currency1, we need to invert: sqrtPrice = 2^192 / FLOOR_SQRT_PRICE_X96
        uint160 sqrtPriceX96;
        if (tokenIsCurrency0) {
            sqrtPriceX96 = FLOOR_SQRT_PRICE_X96;
        } else {
            // Invert the price: new_sqrt = 2^96 / old_sqrt (since price inverts as p' = 1/p)
            sqrtPriceX96 = uint160((uint256(1) << 192) / uint256(FLOOR_SQRT_PRICE_X96));
        }

        // 5. Initialize pool via PoolManager directly (avoids calldata/memory mismatch)
        POOL_MANAGER.initialize(poolKey, sqrtPriceX96);

        // 6. Calculate tick range for single-sided token liquidity
        int24 tickLower;
        int24 tickUpper;
        uint160 sqrtPriceLower;
        uint160 sqrtPriceUpper;

        if (tokenIsCurrency0) {
            // Token is currency0. Single-sided token0: provide from current price to max
            // Current price is at FLOOR_TICK, so liquidity from FLOOR_TICK to MAX_TICK
            tickLower = FLOOR_TICK;
            tickUpper = TickMath.maxUsableTick(POOL_TICK_SPACING);
        } else {
            // Token is currency1. Single-sided token1: provide from min to current price
            tickLower = TickMath.minUsableTick(POOL_TICK_SPACING);
            tickUpper = -FLOOR_TICK; // Inverted tick for the other direction
        }

        sqrtPriceLower = TickMath.getSqrtPriceAtTick(tickLower);
        sqrtPriceUpper = TickMath.getSqrtPriceAtTick(tickUpper);

        // 7. Calculate liquidity from token amount
        uint128 liquidity;
        if (tokenIsCurrency0) {
            liquidity = LiquidityAmounts.getLiquidityForAmount0(
                sqrtPriceLower,
                sqrtPriceUpper,
                TOTAL_SUPPLY
            );
        } else {
            liquidity = LiquidityAmounts.getLiquidityForAmount1(
                sqrtPriceLower,
                sqrtPriceUpper,
                TOTAL_SUPPLY
            );
        }

        // 8. Approve token for Permit2, then Permit2 allowance for PositionManager
        IERC20(token).approve(PERMIT2, type(uint256).max);
        IAllowanceTransfer(PERMIT2).approve(
            token,
            address(POSITION_MANAGER),
            type(uint160).max,
            type(uint48).max
        );

        // 9. Build modifyLiquidities calldata
        //    Actions: MINT_POSITION, SETTLE_PAIR, CLOSE_CURRENCY x2
        uint128 amount0Max = tokenIsCurrency0 ? uint128(TOTAL_SUPPLY) : 0;
        uint128 amount1Max = tokenIsCurrency0 ? 0 : uint128(TOTAL_SUPPLY);

        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION),
            uint8(Actions.CLOSE_CURRENCY),
            uint8(Actions.CLOSE_CURRENCY)
        );

        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            uint256(liquidity),
            amount0Max,
            amount1Max,
            msg.sender, // Position NFT goes to the launcher
            bytes("")   // No hook data
        );
        params[1] = abi.encode(Currency.wrap(currency0));
        params[2] = abi.encode(Currency.wrap(currency1));

        // 10. Execute: initialize pool + mint position
        POSITION_MANAGER.modifyLiquidities(
            abi.encode(actions, params),
            block.timestamp
        );

        emit TokenLaunched(token, msg.sender, name, symbol);
    }
}
