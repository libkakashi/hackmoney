// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title LaunchToken
/// @notice Minimal ERC20 that mints total supply to a recipient in the constructor
contract LaunchToken is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address recipient_
    ) ERC20(name_, symbol_) {
        _mint(recipient_, totalSupply_);
    }
}
