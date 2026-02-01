// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardTransient} from "openzeppelin-contracts/contracts/utils/ReentrancyGuardTransient.sol";
import {FullRangeLBPStrategyFactory} from "liquidity-launcher/src/factories/lbp/FullRangeLBPStrategyFactory.sol";

import {ITokenFactory} from "uerc20-factory/interfaces/ITokenFactory.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IDistributionStrategy} from "liquidity-launcher/src/interfaces/IDistributionStrategy.sol";
import {IDistributionContract} from "liquidity-launcher/src/interfaces/IDistributionContract.sol";
import {ILBPStrategyBase} from "liquidity-launcher/src/interfaces/ILBPStrategyBase.sol";

import {UERC20Metadata} from "uerc20-factory/libraries/UERC20MetadataLibrary.sol";
import {ActionConstants} from "v4-periphery/src/libraries/ActionConstants.sol";
import {MigratorParameters} from "liquidity-launcher/src/types/MigratorParameters.sol";
import {AuctionParameters} from "continuous-clearing-auction/src/interfaces/IContinuousClearingAuction.sol";

/// @title Launchpad
/// @notice Factory that creates UERC20 tokens and launches them via CCA auction with full-range liquidity on Uniswap V4
/// @dev Integrates with Uniswap's liquidity-launcher FullRangeLBPStrategy for CCA auctions and V4 pool deployment
/// @custom:security-contact security@uniswap.org
contract Launchpad is ReentrancyGuardTransient {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a new token is launched with a CCA auction
    /// @param token The deployed token address
    /// @param strategy The deployed FullRangeLBPStrategy address
    /// @param auction The deployed CCA auction address
    /// @param creator The address that initiated the launch
    /// @param name The token name
    /// @param symbol The token symbol
    /// @param description The token description
    /// @param website The token website
    /// @param image The token image URL
    /// @param auctionStartBlock The block when the auction starts
    /// @param auctionEndBlock The block when the auction ends
    /// @param auctionClaimBlock The block when claims become available
    /// @param poolMigrationBlock The block when migration to V4 pool can occur
    /// @param salt The salt used for deterministic deployment
    event TokenLaunched(
        address indexed token,
        address indexed strategy,
        address indexed auction,
        address creator,
        string name,
        string symbol,
        string description,
        string website,
        string image,
        uint64 auctionStartBlock,
        uint64 auctionEndBlock,
        uint64 auctionClaimBlock,
        uint64 poolMigrationBlock,
        bytes32 salt
    );

    /*//////////////////////////////////////////////////////////////
                                 STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Parameters for token creation
    /// @param name The ERC20 token name
    /// @param symbol The ERC20 token symbol
    /// @param metadata Token metadata (description, website, image)
    struct TokenParams {
        string name;
        string symbol;
        UERC20Metadata metadata;
    }

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Token decimals (always 18)
    uint8 public constant TOKEN_DECIMALS = 18;

    /// @notice Total supply to mint
    uint128 public constant TOTAL_SUPPLY = 1_000_000 * 1e18;

    /// @notice Floor price for auction (tick -299340, Q96 format)
    uint256 public constant FLOOR_PRICE = 7931558425297600;

    /// @notice CCA tick spacing (~1% of floor price)
    uint256 public constant CCA_TICK_SPACING = 79315584252976;

    /// @notice Auction duration in blocks (30 mins, 10s block time)
    uint64 public constant AUCTION_DURATION = 180;

    /// @notice Blocks after auction end before claims are allowed
    uint64 public constant CLAIM_DELAY = 10;

    /// @notice Blocks after auction end before migration can occur
    uint64 public constant MIGRATION_DELAY = 20;

    /// @notice Blocks after migration before sweep is allowed (~1 day)
    uint64 public constant SWEEP_DELAY = 7200;

    /// @notice Total MPS (milli-bips) that must be distributed = 100%
    uint24 public constant TOTAL_MPS = 10_000_000;

    /// @notice LP fee for the V4 pool (1%)
    uint24 public constant POOL_LP_FEE = 10000;

    /// @notice Tick spacing for the V4 pool
    int24 public constant POOL_TICK_SPACING = 60;

    /// @notice Token split for auction (10% = 1_000_000 / 10_000_000)
    uint24 public constant TOKEN_SPLIT = 1000000;

    /// @notice Maximum currency amount for LP (type(int128).max)
    uint128 public constant MAX_CURRENCY_AMOUNT_FOR_LP =
        uint128(type(int128).max);

    /// @notice Minimum required currency raised (0 = no minimum)
    uint128 public constant REQUIRED_CURRENCY_RAISED = 0;

    /// @notice Recipient address for LP position NFT and operator role
    address public constant RECIPIENT =
        0x70997970C51812dc3A010C7d01b50e0d17dc79C8;

    /*//////////////////////////////////////////////////////////////
                               IMMUTABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice The UERC20 token factory for creating new tokens
    address public immutable TOKEN_FACTORY;

    /// @notice The FullRangeLBPStrategy factory for creating distribution strategies
    address public immutable STRATEGY_FACTORY;

    /// @notice The ContinuousClearingAuction factory for creating auctions
    address public immutable CCA_FACTORY;

    /// @notice The currency used for auctions (e.g., USDC)
    address public immutable CURRENCY;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when auction steps data doesn't sum to TOTAL_MPS
    error InvalidStepsDataMps(uint256 actual, uint256 expected);

    /// @notice Thrown when auction steps data duration doesn't match AUCTION_DURATION
    error InvalidStepsDataDuration(uint64 actual, uint64 expected);

    /// @notice Initialize the Launchpad with required factory addresses
    /// @param tokenFactory The UERC20 factory address
    /// @param strategyFactory The FullRangeLBPStrategy factory address
    /// @param ccaFactory The ContinuousClearingAuction factory address
    /// @param currency The currency address for auctions
    constructor(
        address tokenFactory,
        address strategyFactory,
        address ccaFactory,
        address currency
    ) {
        TOKEN_FACTORY = tokenFactory;
        STRATEGY_FACTORY = strategyFactory;
        CCA_FACTORY = ccaFactory;
        CURRENCY = currency;

        // Validate that calculated steps data is correct for AUCTION_DURATION
        _validateAuctionStepsData(AUCTION_DURATION);
    }

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Launch a new token with a CCA auction that migrates to full-range V4 liquidity
    /// @dev Creates token -> deploys strategy -> transfers tokens -> strategy creates auction
    /// @param tokenParams Parameters for the token to create (name, symbol, totalSupply, metadata)
    /// @param salt Salt for deterministic deployment
    /// @return token The deployed token address
    /// @return strategy The deployed FullRangeLBPStrategy address
    /// @return auction The deployed CCA auction address
    function launch(
        TokenParams calldata tokenParams,
        uint64 startBlock,
        bytes32 salt
    )
        external
        nonReentrant
        returns (address token, address strategy, address auction)
    {
        uint64 endBlock = startBlock + AUCTION_DURATION;
        uint64 claimBlock = endBlock + CLAIM_DELAY;
        uint64 migrationBlock = endBlock + MIGRATION_DELAY;
        uint64 sweepBlock = migrationBlock + SWEEP_DELAY;

        // 1. Create the UERC20 token (minted to this contract)
        token = _createToken(tokenParams, salt);

        // 2. Build migrator parameters for the FullRangeLBPStrategy
        MigratorParameters memory migratorParams = MigratorParameters({
            migrationBlock: migrationBlock,
            currency: CURRENCY,
            poolLPFee: POOL_LP_FEE,
            poolTickSpacing: POOL_TICK_SPACING,
            tokenSplit: TOKEN_SPLIT,
            initializerFactory: CCA_FACTORY,
            positionRecipient: RECIPIENT,
            sweepBlock: sweepBlock,
            operator: RECIPIENT,
            maxCurrencyAmountForLP: MAX_CURRENCY_AMOUNT_FOR_LP
        });

        // 3. Build auction parameters for the CCA
        AuctionParameters memory auctionParams = AuctionParameters({
            currency: CURRENCY,
            tokensRecipient: ActionConstants.MSG_SENDER,
            fundsRecipient: ActionConstants.MSG_SENDER,
            startBlock: startBlock,
            endBlock: endBlock,
            claimBlock: claimBlock,
            tickSpacing: CCA_TICK_SPACING,
            validationHook: address(0),
            floorPrice: FLOOR_PRICE,
            requiredCurrencyRaised: REQUIRED_CURRENCY_RAISED,
            auctionStepsData: _calculateAuctionStepsData(AUCTION_DURATION)
        });

        // 4. Encode strategy config: MigratorParameters + encoded AuctionParameters
        bytes memory strategyConfig = abi.encode(
            migratorParams,
            abi.encode(auctionParams)
        );

        // 5. Deploy the FullRangeLBPStrategy via factory
        strategy = address(
            IDistributionStrategy(STRATEGY_FACTORY).initializeDistribution(
                token,
                TOTAL_SUPPLY,
                strategyConfig,
                salt // pass salt directly, it does hash(caller, salt) internally
            )
        );

        // 6. Transfer all tokens to the strategy
        IERC20(token).safeTransfer(strategy, TOTAL_SUPPLY);

        // 7. Notify strategy of token receipt - this deploys the CCA auction
        IDistributionContract(strategy).onTokensReceived();

        // 8. Retrieve the deployed auction address from the strategy
        auction = address(ILBPStrategyBase(strategy).initializer());

        emit TokenLaunched(
            token,
            strategy,
            auction,
            msg.sender,
            tokenParams.name,
            tokenParams.symbol,
            tokenParams.metadata.description,
            tokenParams.metadata.website,
            tokenParams.metadata.image,
            startBlock,
            endBlock,
            claimBlock,
            migrationBlock,
            salt
        );
    }

    /*//////////////////////////////////////////////////////////////
                          SALT MINING HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Hook permission flags for validating strategy addresses
    uint160 public constant ALL_HOOK_MASK = uint160((1 << 14) - 1); // 0x3FFF
    uint160 public constant REQUIRED_HOOK_FLAGS = 1 << 13; // 0x2000 (beforeInitialize only)

    /// @notice Returns the encoded strategy config for a given start block
    /// @dev Use this to pre-fetch config data for off-chain salt mining.
    ///      This is the exact config that will be used when launch() is called at startBlock.
    /// @param startBlock The block number when the auction will start (i.e., when launch() is called)
    function getStrategyConfig(
        uint64 startBlock
    )
        public
        view
        returns (
            MigratorParameters memory migratorParams,
            bytes memory auctionParamsEncoded,
            address tokenFactory,
            address strategyFactory,
            address ccaFactory,
            address currency,
            IPositionManager positionManager,
            IPoolManager poolManager
        )
    {
        uint64 endBlock = startBlock + AUCTION_DURATION;
        uint64 claimBlock = endBlock + CLAIM_DELAY;
        uint64 migrationBlock = endBlock + MIGRATION_DELAY;
        uint64 sweepBlock = migrationBlock + SWEEP_DELAY;

        migratorParams = MigratorParameters({
            migrationBlock: migrationBlock,
            currency: CURRENCY,
            poolLPFee: POOL_LP_FEE,
            poolTickSpacing: POOL_TICK_SPACING,
            tokenSplit: TOKEN_SPLIT,
            initializerFactory: CCA_FACTORY,
            positionRecipient: RECIPIENT,
            sweepBlock: sweepBlock,
            operator: RECIPIENT,
            maxCurrencyAmountForLP: MAX_CURRENCY_AMOUNT_FOR_LP
        });

        AuctionParameters memory auctionParams = AuctionParameters({
            currency: CURRENCY,
            tokensRecipient: ActionConstants.MSG_SENDER,
            fundsRecipient: ActionConstants.MSG_SENDER,
            startBlock: startBlock,
            endBlock: endBlock,
            claimBlock: claimBlock,
            tickSpacing: CCA_TICK_SPACING,
            validationHook: address(0),
            floorPrice: FLOOR_PRICE,
            requiredCurrencyRaised: REQUIRED_CURRENCY_RAISED,
            auctionStepsData: _calculateAuctionStepsData(AUCTION_DURATION)
        });
        auctionParamsEncoded = abi.encode(auctionParams);

        tokenFactory = TOKEN_FACTORY;
        strategyFactory = STRATEGY_FACTORY;
        ccaFactory = CCA_FACTORY;
        currency = CURRENCY;

        positionManager = IPositionManager(
            address(
                FullRangeLBPStrategyFactory(STRATEGY_FACTORY).positionManager()
            )
        );
        poolManager = IPoolManager(
            address(FullRangeLBPStrategyFactory(STRATEGY_FACTORY).poolManager())
        );
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Create a UERC20 token via the token factory
    /// @param tokenParams Token creation parameters
    /// @param salt User-provided salt for deterministic address
    /// @return token The deployed token address
    function _createToken(
        TokenParams calldata tokenParams,
        bytes32 salt
    ) internal returns (address token) {
        bytes32 graffiti = keccak256(abi.encode(msg.sender, salt));

        token = ITokenFactory(TOKEN_FACTORY).createToken(
            tokenParams.name,
            tokenParams.symbol,
            TOKEN_DECIMALS,
            TOTAL_SUPPLY,
            address(this),
            abi.encode(tokenParams.metadata),
            graffiti
        );
    }

    /// @notice Calculate auction steps data for a given duration
    /// @dev Distributes TOTAL_MPS (10,000,000) across the duration.
    ///      Uses 1 step if evenly divisible, otherwise 2 steps to handle remainder.
    /// @param duration The auction duration in blocks
    /// @return auctionStepsData Encoded steps data for CCA
    function _calculateAuctionStepsData(
        uint64 duration
    ) internal pure returns (bytes memory auctionStepsData) {
        require(duration > 0, "Duration must be > 0");

        uint24 baseMps = uint24(TOTAL_MPS / duration);
        uint24 remainder = uint24(TOTAL_MPS % duration);

        if (remainder == 0) {
            // Perfect division: single step
            auctionStepsData = abi.encodePacked(
                bytes3(uint24(baseMps)),
                bytes5(uint40(duration))
            );
        } else {
            // Need 2 steps to distribute remainder
            // Step 1: (baseMps + 1) for `remainder` blocks
            // Step 2: baseMps for (duration - remainder) blocks
            // Total: (baseMps + 1) * remainder + baseMps * (duration - remainder)
            //      = baseMps * remainder + remainder + baseMps * duration - baseMps * remainder
            //      = baseMps * duration + remainder
            //      = TOTAL_MPS ✓
            auctionStepsData = abi.encodePacked(
                bytes3(uint24(baseMps + 1)),
                bytes5(uint40(remainder)),
                bytes3(uint24(baseMps)),
                bytes5(uint40(duration - remainder))
            );
        }
    }

    /// @notice Validate that auction steps data is correct for a given duration
    /// @dev Parses the generated steps and verifies constraints match CCA requirements
    /// @param duration The auction duration to validate
    function _validateAuctionStepsData(uint64 duration) internal pure {
        bytes memory data = _calculateAuctionStepsData(duration);

        uint256 totalMps;
        uint64 totalBlocks;

        // Parse each 8-byte step: 3 bytes mps + 5 bytes blockDelta
        for (uint256 i = 0; i < data.length; i += 8) {
            uint24 mps;
            uint40 blockDelta;
            assembly {
                let step := mload(add(add(data, 32), i))
                step := shr(192, step)
                mps := shr(40, step)
                blockDelta := and(step, 0xFFFFFFFFFF)
            }
            totalMps += uint256(mps) * uint256(blockDelta);
            totalBlocks += uint64(blockDelta);
        }

        if (totalMps != TOTAL_MPS) {
            revert InvalidStepsDataMps(totalMps, TOTAL_MPS);
        }
        if (totalBlocks != duration) {
            revert InvalidStepsDataDuration(totalBlocks, duration);
        }
    }
}
