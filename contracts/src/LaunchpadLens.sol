// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Metadata} from "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {FullMath} from "v4-core/libraries/FullMath.sol";

contract LaunchpadLens {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    struct TokenData {
        string name;
        string symbol;
        uint8 decimals;
        uint256 totalSupply;
    }

    struct PoolInfo {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        bool isInitialized;
        uint160 sqrtPriceX96;
        int24 tick;
    }

    struct PoolPrice {
        int24 tick;
        uint160 sqrtPriceX96;
        uint256 priceE18;
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

    /// @notice Get pool info for a token/currency pair (hookless pool)
    function getPoolInfo(
        IPoolManager poolManager,
        address token,
        address currency,
        uint24 fee,
        int24 tickSpacing
    ) external view returns (PoolInfo memory info) {
        (address c0, address c1) = token < currency
            ? (token, currency)
            : (currency, token);

        info.currency0 = c0;
        info.currency1 = c1;
        info.fee = fee;
        info.tickSpacing = tickSpacing;

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(address(0))
        });

        PoolId poolId = key.toId();
        (uint160 sqrtPriceX96, int24 tick, , ) = poolManager.getSlot0(poolId);
        info.isInitialized = sqrtPriceX96 != 0;
        info.sqrtPriceX96 = sqrtPriceX96;
        info.tick = tick;
    }

    function getPoolPrice(
        IPoolManager poolManager,
        PoolKey calldata poolKey
    ) external view returns (PoolPrice memory result) {
        PoolId poolId = poolKey.toId();
        (uint160 sqrtPriceX96, int24 tick, , ) = poolManager.getSlot0(poolId);

        result.tick = tick;
        result.sqrtPriceX96 = sqrtPriceX96;

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
