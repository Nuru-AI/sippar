/**
 * Automatic Minting Handler - Sprint 012.5
 * Implements DepositHandler interface for automatic ckALGO minting
 */

import { DepositHandler, PendingDeposit } from './depositDetectionService.js';
import { AutomaticMintingService } from './automaticMintingService.js';

export class AutomaticMintingHandler implements DepositHandler {
  private mintingService: AutomaticMintingService;

  constructor(mintingService: AutomaticMintingService) {
    this.mintingService = mintingService;
  }

  async handleConfirmedDeposit(deposit: PendingDeposit): Promise<void> {
    console.log(`🎯 AutomaticMintingHandler: Processing confirmed deposit ${deposit.txId} (${deposit.amount} ALGO)`);

    try {
      // Queue the deposit for automatic minting
      const jobId = await this.mintingService.queueDepositForMinting(deposit);

      console.log(`✅ Queued deposit ${deposit.txId} for automatic minting (job: ${jobId})`);

    } catch (error) {
      console.error(`❌ Failed to queue deposit ${deposit.txId} for automatic minting:`, error);
      throw error;
    }
  }
}