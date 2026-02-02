/**
 * Consensus Validator - Validates multi-relayer signatures
 * Implements Strategy Pattern for consensus validation
 * 
 * SOLID Principles:
 * - Single Responsibility: Only validates consensus
 * - Open/Closed: Can extend with different consensus mechanisms
 * - Dependency Inversion: Depends on service abstractions
 */

const logger = require('../../shared/utils/logger');
const { ConsensusError } = require('../../shared/utils/errors');

class ConsensusValidator {
  constructor() {
    this.requiredSignatures = parseInt(process.env.REQUIRED_SIGNATURES) || 2;
    this.totalRelayers = parseInt(process.env.TOTAL_RELAYERS) || 3;
  }

  /**
   * Validate consensus has been reached
   * Implements 2-of-3 multisig validation
   */
  validateConsensus(signatures) {
    try {
      if (!Array.isArray(signatures)) {
        throw new ConsensusError('Signatures must be an array');
      }

      const validSignatures = signatures.filter(sig => 
        sig && sig.signature && sig.relayerId && sig.publicKey
      );

      const hasConsensus = validSignatures.length >= this.requiredSignatures;

      logger.info('Consensus validation result', {
        total: signatures.length,
        valid: validSignatures.length,
        required: this.requiredSignatures,
        hasConsensus
      });

      return {
        hasConsensus,
        validSignatures: validSignatures.length,
        requiredSignatures: this.requiredSignatures,
        signatures: validSignatures
      };

    } catch (error) {
      logger.error('Consensus validation failed', error);
      throw new ConsensusError('Consensus validation failed', { 
        originalError: error.message 
      });
    }
  }

  /**
   * Check for unique relayers (prevent double voting)
   * Implements Guard Pattern
   */
  validateUniqueRelayers(signatures) {
    const relayerIds = signatures.map(sig => sig.relayerId);
    const uniqueRelayerIds = new Set(relayerIds);

    if (relayerIds.length !== uniqueRelayerIds.size) {
      logger.warn('Duplicate relayer signatures detected', { relayerIds });
      throw new ConsensusError('Duplicate relayer signatures detected');
    }

    return true;
  }

  /**
   * Validate signature timing (prevent old signatures)
   * Implements temporal validation
   */
  validateSignatureTiming(signatures, maxAgeMinutes = 30) {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;

    for (const sig of signatures) {
      if (!sig.timestamp) continue;

      const signatureTime = new Date(sig.timestamp).getTime();
      const age = now - signatureTime;

      if (age > maxAge) {
        logger.warn('Signature too old', {
          relayerId: sig.relayerId,
          age: age / 1000 / 60,
          maxAgeMinutes
        });
        throw new ConsensusError('Signature expired', {
          relayerId: sig.relayerId,
          age: age / 1000 / 60
        });
      }
    }

    return true;
  }

  /**
   * Comprehensive consensus check
   * Combines all validation rules
   */
  async validateFullConsensus(eventData, signatures) {
    try {
      // Check basic consensus
      const consensusResult = this.validateConsensus(signatures);
      
      if (!consensusResult.hasConsensus) {
        logger.info('Consensus not yet reached', {
          eventId: eventData.eventId,
          current: consensusResult.validSignatures,
          required: consensusResult.requiredSignatures
        });
        return {
          isValid: false,
          reason: 'INSUFFICIENT_SIGNATURES',
          ...consensusResult
        };
      }

      // Validate unique relayers
      this.validateUniqueRelayers(consensusResult.signatures);

      // Validate timing
      this.validateSignatureTiming(consensusResult.signatures);

      logger.info('Full consensus validation passed', {
        eventId: eventData.eventId,
        signatures: consensusResult.validSignatures
      });

      return {
        isValid: true,
        ...consensusResult
      };

    } catch (error) {
      if (error instanceof ConsensusError) {
        return {
          isValid: false,
          reason: error.code,
          error: error.message
        };
      }
      throw error;
    }
  }

  /**
   * Determine next action based on consensus state
   * Implements State Pattern
   */
  determineAction(consensusResult, eventStatus) {
    if (!consensusResult.isValid) {
      return {
        action: 'WAIT',
        reason: consensusResult.reason || 'Consensus not reached'
      };
    }

    // Determine execution action based on event status
    const actionMap = {
      'PENDING_MINT': {
        action: 'MINT',
        targetChain: 'ethereum',
        method: 'mintWrapped'
      },
      'PENDING_UNLOCK': {
        action: 'UNLOCK',
        targetChain: 'arbitrum',
        method: 'unlockTokens'
      }
    };

    const nextAction = actionMap[eventStatus];
    if (!nextAction) {
      logger.warn('Unknown event status for action determination', { eventStatus });
      return {
        action: 'ERROR',
        reason: `Unknown status: ${eventStatus}`
      };
    }

    return {
      action: nextAction.action,
      targetChain: nextAction.targetChain,
      method: nextAction.method,
      consensusAchieved: true
    };
  }
}

module.exports = new ConsensusValidator();
