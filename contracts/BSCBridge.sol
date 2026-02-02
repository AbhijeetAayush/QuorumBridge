// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BSCBridge
 * @dev Bridge contract for BSC chain - handles token locking and unlocking
 * @notice Locks tokens on BSC, emits events for relayers to mint on Ethereum
 * 
 * Design Patterns Applied:
 * - Strategy Pattern (lock/unlock strategies)
 * - Observer Pattern (event emission for relayers)
 * - Guard Pattern (reentrancy guard, pause mechanism)
 * - Command Pattern (lock/unlock commands)
 * 
 * SOLID Principles:
 * - Single Responsibility: Only handles BSC bridge operations
 * - Open/Closed: Can be extended without modification
 * - Liskov Substitution: Can replace any bridge interface
 * - Dependency Inversion: Depends on IERC20 abstraction
 */
contract BSCBridge is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public nonce;
    uint256 public minLockAmount;
    uint256 public maxLockAmount;

    // Mapping to track processed unlock events
    mapping(bytes32 => bool) public processedUnlocks;

    /**
     * @dev Emitted when tokens are locked on BSC
     * Relayers listen to this event to mint on Ethereum
     */
    event TokensLocked(
        address indexed from,
        uint256 amount,
        uint256 indexed nonce,
        bytes32 indexed eventId,
        uint256 timestamp
    );

    /**
     * @dev Emitted when tokens are unlocked on BSC
     * Happens after burn on Ethereum
     */
    event TokensUnlocked(
        address indexed to,
        uint256 amount,
        bytes32 indexed eventId,
        uint256 timestamp
    );

    /**
     * @dev Emitted when bridge limits are updated
     */
    event LimitsUpdated(uint256 minAmount, uint256 maxAmount);

    /**
     * @dev Constructor initializes the bridge
     * @param _token Address of the BEP20 token
     * @param initialOwner Address that will own the contract
     * @param _minLockAmount Minimum amount that can be locked
     * @param _maxLockAmount Maximum amount that can be locked
     */
    constructor(
        address _token,
        address initialOwner,
        uint256 _minLockAmount,
        uint256 _maxLockAmount
    ) Ownable(initialOwner) {
        require(_token != address(0), "BSCBridge: token is zero address");
        require(_minLockAmount > 0, "BSCBridge: min amount must be greater than 0");
        require(_maxLockAmount > _minLockAmount, "BSCBridge: max must be greater than min");
        
        token = IERC20(_token);
        minLockAmount = _minLockAmount;
        maxLockAmount = _maxLockAmount;
    }

    /**
     * @dev Locks tokens on BSC for cross-chain transfer
     * Implements Command Pattern
     * @param amount Amount of tokens to lock
     * @return eventId Unique identifier for this lock event
     */
    function lockTokens(uint256 amount) 
        external 
        whenNotPaused 
        nonReentrant 
        returns (bytes32 eventId) 
    {
        require(amount >= minLockAmount, "BSCBridge: amount below minimum");
        require(amount <= maxLockAmount, "BSCBridge: amount exceeds maximum");
        require(token.balanceOf(msg.sender) >= amount, "BSCBridge: insufficient balance");

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

        // Transfer tokens from user to bridge (lock)
        token.safeTransferFrom(msg.sender, address(this), amount);

        emit TokensLocked(msg.sender, amount, nonce, eventId, block.timestamp);
        
        return eventId;
    }

    /**
     * @dev Unlocks tokens on BSC after burn on Ethereum
     * Can only be called by owner (relayer backend)
     * Implements Strategy Pattern for unlock logic
     * @param to Address to receive unlocked tokens
     * @param amount Amount of tokens to unlock
     * @param eventId Unique identifier from Ethereum burn event
     */
    function unlockTokens(
        address to,
        uint256 amount,
        bytes32 eventId
    ) external onlyOwner whenNotPaused nonReentrant {
        require(to != address(0), "BSCBridge: unlock to zero address");
        require(amount > 0, "BSCBridge: unlock amount is zero");
        require(!processedUnlocks[eventId], "BSCBridge: event already processed");
        require(token.balanceOf(address(this)) >= amount, "BSCBridge: insufficient bridge balance");

        processedUnlocks[eventId] = true;

        // Transfer tokens from bridge to user (unlock)
        token.safeTransfer(to, amount);

        emit TokensUnlocked(to, amount, eventId, block.timestamp);
    }

    /**
     * @dev Updates minimum and maximum lock amounts
     * @param _minLockAmount New minimum lock amount
     * @param _maxLockAmount New maximum lock amount
     */
    function updateLimits(uint256 _minLockAmount, uint256 _maxLockAmount) 
        external 
        onlyOwner 
    {
        require(_minLockAmount > 0, "BSCBridge: min amount must be greater than 0");
        require(_maxLockAmount > _minLockAmount, "BSCBridge: max must be greater than min");
        
        minLockAmount = _minLockAmount;
        maxLockAmount = _maxLockAmount;
        
        emit LimitsUpdated(_minLockAmount, _maxLockAmount);
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
     * @dev Returns the current balance of locked tokens
     * @return uint256 Bridge token balance
     */
    function getLockedBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @dev Emergency function to recover stuck tokens
     * Can only be called by owner
     * @param _token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyWithdraw(address _token, uint256 amount) 
        external 
        onlyOwner 
    {
        require(_token != address(0), "BSCBridge: token is zero address");
        IERC20(_token).safeTransfer(owner(), amount);
    }
}
