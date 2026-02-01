// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IWrappedToken.sol";

/**
 * @title WrappedToken
 * @dev Mintable/Burnable ERC20 token for Ethereum chain
 * @notice Wrapped representation of BSC token on Ethereum
 * 
 * Design Patterns Applied:
 * - Proxy Pattern (wrapped token concept)
 * - Factory Pattern (mint creates new tokens)
 * - State Pattern (Pausable functionality)
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles wrapped token logic
 * - Open/Closed: Extensible via inheritance
 * - Liskov Substitution: Implements IWrappedToken interface
 * - Interface Segregation: Separate mint/burn from transfer
 * - Dependency Inversion: Depends on IWrappedToken abstraction
 */
contract WrappedToken is ERC20, Ownable, Pausable, IWrappedToken {
    address public bridge;
    
    // Mapping to track processed events (prevent double minting)
    mapping(bytes32 => bool) public processedEvents;

    /**
     * @dev Emitted when bridge address is updated
     */
    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);

    /**
     * @dev Modifier to restrict function access to bridge contract only
     * Implements Guard Pattern
     */
    modifier onlyBridge() {
        require(msg.sender == bridge, "WrappedToken: caller is not the bridge");
        _;
    }

    /**
     * @dev Constructor sets initial owner and bridge address
     * @param initialOwner Address that will own the contract
     * @param _bridge Address of the bridge contract
     */
    constructor(address initialOwner, address _bridge) 
        ERC20("Wrapped Cross-Chain Bridge Token", "wCCBT") 
        Ownable(initialOwner) 
    {
        require(_bridge != address(0), "WrappedToken: bridge is zero address");
        bridge = _bridge;
        emit BridgeUpdated(address(0), _bridge);
    }

    /**
     * @dev Updates the bridge contract address
     * @param newBridge New bridge contract address
     * Can only be called by owner
     */
    function setBridge(address newBridge) external onlyOwner {
        require(newBridge != address(0), "WrappedToken: new bridge is zero address");
        address oldBridge = bridge;
        bridge = newBridge;
        emit BridgeUpdated(oldBridge, newBridge);
    }

    /**
     * @dev Mints tokens to specified address
     * Implements Factory Pattern for token creation
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint
     * @param eventId Unique identifier for cross-chain event
     */
    function mint(address to, uint256 amount, bytes32 eventId) 
        external 
        override 
        onlyBridge 
        whenNotPaused 
    {
        require(to != address(0), "WrappedToken: mint to zero address");
        require(amount > 0, "WrappedToken: mint amount is zero");
        require(!processedEvents[eventId], "WrappedToken: event already processed");
        
        processedEvents[eventId] = true;
        _mint(to, amount);
        
        emit Minted(to, amount, eventId);
    }

    /**
     * @dev Burns tokens from specified address
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     * @param eventId Unique identifier for cross-chain event
     */
    function burn(address from, uint256 amount, bytes32 eventId) 
        external 
        override 
        onlyBridge 
        whenNotPaused 
    {
        require(from != address(0), "WrappedToken: burn from zero address");
        require(amount > 0, "WrappedToken: burn amount is zero");
        require(!processedEvents[eventId], "WrappedToken: event already processed");
        
        processedEvents[eventId] = true;
        _burn(from, amount);
        
        emit Burned(from, amount, eventId);
    }

    /**
     * @dev Pauses all token operations
     * Can only be called by the owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all token operations
     * Can only be called by the owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Hook called before any transfer of tokens
     * Implements Template Method Pattern
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
