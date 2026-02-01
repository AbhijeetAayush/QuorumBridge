// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IBEP20.sol";

/**
 * @title IWrappedToken
 * @dev Interface for wrapped token with mint/burn capabilities
 * @notice Extends IBEP20 with bridge-specific operations
 * Follows Interface Segregation Principle
 */
interface IWrappedToken is IBEP20 {
    /**
     * @dev Emitted when tokens are minted by the bridge
     */
    event Minted(address indexed to, uint256 amount, bytes32 indexed eventId);

    /**
     * @dev Emitted when tokens are burned for cross-chain transfer
     */
    event Burned(address indexed from, uint256 amount, bytes32 indexed eventId);

    /**
     * @dev Mints `amount` tokens to `to` address
     * Can only be called by authorized bridge contract
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint
     * @param eventId Unique identifier for cross-chain event
     */
    function mint(address to, uint256 amount, bytes32 eventId) external;

    /**
     * @dev Burns `amount` tokens from `from` address
     * Can only be called by authorized bridge contract
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param eventId Unique identifier for cross-chain event
     */
    function burn(address from, uint256 amount, bytes32 eventId) external;
}
