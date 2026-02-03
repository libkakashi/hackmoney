// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IContinuousClearingAuction} from "continuous-clearing-auction/src/interfaces/IContinuousClearingAuction.sol";
import {Bid} from "continuous-clearing-auction/src/libraries/BidLib.sol";

contract LaunchpadLens {
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
}
