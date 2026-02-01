// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IBEP20
 * @dev Interface for BEP20 token standard (compatible with ERC20)
 * @notice Follows Interface Segregation Principle - only essential token operations
 */
interface IBEP20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to another (`to`)
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the amount of tokens in existence
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`
     * Returns a boolean value indicating success
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` can spend on behalf of `owner`
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens
     * Returns a boolean value indicating success
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the allowance mechanism
     * Returns a boolean value indicating success
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
