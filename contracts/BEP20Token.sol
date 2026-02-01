// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IBEP20.sol";

/**
 * @title BEP20Token
 * @dev Implementation of BEP20 token for BSC chain
 * @notice Fixed supply token with pause capability
 * 
 * Design Patterns Applied:
 * - Template Method Pattern (via OpenZeppelin ERC20)
 * - State Pattern (Pausable functionality)
 * 
 * SOLID Principles:
 * - Single Responsibility: Token logic only
 * - Open/Closed: Extensible via inheritance
 * - Liskov Substitution: Compatible with IBEP20 interface
 * - Dependency Inversion: Depends on abstractions (Ownable, Pausable)
 */
contract BEP20Token is ERC20, Ownable, Pausable {
    uint256 private constant TOTAL_SUPPLY = 1_000_000 * 10**18; // 1 million tokens

    /**
     * @dev Emitted when tokens are minted at deployment
     */
    event TokensDeployed(address indexed owner, uint256 totalSupply);

    /**
     * @dev Constructor mints total supply to deployer
     * @param initialOwner Address that will own the contract and receive initial supply
     */
    constructor(address initialOwner) ERC20("Cross-Chain Bridge Token", "CCBT") Ownable(initialOwner) {
        _mint(initialOwner, TOTAL_SUPPLY);
        emit TokensDeployed(initialOwner, TOTAL_SUPPLY);
    }

    /**
     * @dev Pauses all token transfers
     * Can only be called by the owner
     * Following Command Pattern for state management
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers
     * Can only be called by the owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens
     * Implements Template Method Pattern
     * @param from Address tokens are transferred from
     * @param to Address tokens are transferred to
     * @param amount Amount of tokens to transfer
     */
    function _update(address from, address to, uint256 amount)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, amount);
    }

    /**
     * @dev Returns the number of decimals used for token amounts
     * @return uint8 Number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
