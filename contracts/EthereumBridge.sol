// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IWrappedToken.sol";

/**
 * @title EthereumBridge
 * @dev Bridge contract for Ethereum chain - handles token minting and burning
 * @notice Mints wrapped tokens on Ethereum, burns them for transfer back to BSC
 * 
 * Design Patterns Applied:
 * - Factory Pattern (minting new tokens)
 * - Observer Pattern (event emission for relayers)
 * - Guard Pattern (reentrancy guard, pause mechanism)
 * - Command Pattern (mint/burn commands)
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles Ethereum bridge operations
 * - Open/Closed: Can be extended without modification
 * - Liskov Substitution: Can replace any bridge interface
 * - Dependency Inversion: Depends on IWrappedToken abstraction
 */
contract EthereumBridge is Ownable, Pausable, ReentrancyGuard {
    IWrappedToken public immutable wrappedToken;
    uint256 public nonce;
    uint256 public minBurnAmount;
    uint256 public maxBurnAmount;

    // Mapping to track processed mint events
    mapping(bytes32 => bool) public processedMints;

    /**
     * @dev Emitted when wrapped tokens are minted on Ethereum
     * Happens after lock on BSC
     */
    event TokensMinted(
        address indexed to,
        uint256 amount,
        bytes32 indexed eventId,
        uint256 timestamp
    );

    /**
     * @dev Emitted when wrapped tokens are burned on Ethereum
     * Relayers listen to this event to unlock on BSC
     */
    event TokensBurned(
        address indexed from,
        uint256 amount,
        uint256 indexed nonce,
        bytes32 indexed eventId,
        uint256 timestamp
    );

    /**
     * @dev Emitted when bridge limits are updated
     */
    event LimitsUpdated(uint256 minAmount, uint256 maxAmount);

    /**
     * @dev Constructor initializes the bridge
     * @param _wrappedToken Address of the wrapped token
     * @param initialOwner Address that will own the contract
     * @param _minBurnAmount Minimum amount that can be burned
     * @param _maxBurnAmount Maximum amount that can be burned
     */
    constructor(
        address _wrappedToken,
        address initialOwner,
        uint256 _minBurnAmount,
        uint256 _maxBurnAmount
    ) Ownable(initialOwner) {
        require(_wrappedToken != address(0), "EthereumBridge: token is zero address");
        require(_minBurnAmount > 0, "EthereumBridge: min amount must be greater than 0");
        require(_maxBurnAmount > _minBurnAmount, "EthereumBridge: max must be greater than min");
        
        wrappedToken = IWrappedToken(_wrappedToken);
        minBurnAmount = _minBurnAmount;
        maxBurnAmount = _maxBurnAmount;
    }

    /**
     * @dev Mints wrapped tokens on Ethereum after lock on BSC
     * Can only be called by owner (relayer backend)
     * Implements Factory Pattern
     * @param to Address to receive minted tokens
     * @param amount Amount of tokens to mint
     * @param eventId Unique identifier from BSC lock event
     */
    function mintWrapped(
        address to,
        uint256 amount,
        bytes32 eventId
    ) external onlyOwner whenNotPaused nonReentrant {
        require(to != address(0), "EthereumBridge: mint to zero address");
        require(amount > 0, "EthereumBridge: mint amount is zero");
        require(!processedMints[eventId], "EthereumBridge: event already processed");

        processedMints[eventId] = true;

        // Mint wrapped tokens
        wrappedToken.mint(to, amount, eventId);

        emit TokensMinted(to, amount, eventId, block.timestamp);
    }

    /**
     * @dev Burns wrapped tokens on Ethereum for cross-chain transfer back to BSC
     * Implements Command Pattern
     * @param amount Amount of tokens to burn
     * @return eventId Unique identifier for this burn event
     */
    function burnWrapped(uint256 amount) 
        external 
        whenNotPaused 
        nonReentrant 
        returns (bytes32 eventId) 
    {
        require(amount >= minBurnAmount, "EthereumBridge: amount below minimum");
        require(amount <= maxBurnAmount, "EthereumBridge: amount exceeds maximum");
        require(wrappedToken.balanceOf(msg.sender) >= amount, "EthereumBridge: insufficient balance");

        // Generate unique event ID
        nonce++;
        eventId = keccak256(
            abi.encodePacked(
                block.chainid,
                address(this),
                msg.sender,
                amount,
                nonce,
                block.timestamp
            )
        );

        // Burn wrapped tokens
        wrappedToken.burn(msg.sender, amount, eventId);

        emit TokensBurned(msg.sender, amount, nonce, eventId, block.timestamp);
        
        return eventId;
    }

    /**
     * @dev Updates minimum and maximum burn amounts
     * @param _minBurnAmount New minimum burn amount
     * @param _maxBurnAmount New maximum burn amount
     */
    function updateLimits(uint256 _minBurnAmount, uint256 _maxBurnAmount) 
        external 
        onlyOwner 
    {
        require(_minBurnAmount > 0, "EthereumBridge: min amount must be greater than 0");
        require(_maxBurnAmount > _minBurnAmount, "EthereumBridge: max must be greater than min");
        
        minBurnAmount = _minBurnAmount;
        maxBurnAmount = _maxBurnAmount;
        
        emit LimitsUpdated(_minBurnAmount, _maxBurnAmount);
    }

    /**
     * @dev Pauses all bridge operations
     * Can only be called by the owner
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all bridge operations
     * Can only be called by the owner
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Returns the total supply of wrapped tokens
     * @return uint256 Wrapped token total supply
     */
    function getWrappedSupply() external view returns (uint256) {
        return wrappedToken.totalSupply();
    }
}
