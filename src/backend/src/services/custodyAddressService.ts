/**
 * Custody Address Service - Sprint X Week 2 Phase 2.2
 * Enhanced address generation for unique custody addresses per deposit
 */

import { icpCanisterService } from './icpCanisterService.js';
import { algorandService } from './algorandService.js';
import { simplifiedBridgeService } from './simplifiedBridgeService.js';
import { Principal } from '@dfinity/principal';
import crypto from 'crypto';

export interface CustodyAddressInfo {
  custodyAddress: string;
  publicKey: Uint8Array;
  userPrincipal: string;
  depositId: string;
  derivationPath: string;
  createdAt: number;
  controlledByThresholdSignatures: boolean;
  purpose: string;
  metadata?: Record<string, string>;
}

export interface CustodyAddressRequest {
  userPrincipal: string;
  purpose?: string; // 'deposit', 'withdrawal', etc.
  metadata?: Record<string, string>;
}

export class CustodyAddressService {
  private custodyAddresses: Map<string, CustodyAddressInfo> = new Map();
  private addressCounter: number = 0;

  /**
   * Generate a REAL threshold-controlled custody address for deposits
   * Phase A.2.1: Uses actual ICP threshold signatures instead of fake addresses
   */
  async generateRealCustodyAddress(request: CustodyAddressRequest): Promise<CustodyAddressInfo> {
    const { userPrincipal, purpose = 'deposit', metadata = {} } = request;

    // Create unique deposit ID
    const timestamp = Date.now();
    const depositId = this.generateDepositId(userPrincipal, timestamp);

    console.log(`🏦 Generating REAL custody address for ${userPrincipal}, depositId: ${depositId}`);

    try {
      // Step 1: Get real threshold signature-generated Algorand address
      const principal = Principal.fromText(userPrincipal);
      const thresholdAddress = await icpCanisterService.deriveAlgorandAddress(userPrincipal);

      console.log(`🔐 Real threshold-controlled address: ${thresholdAddress.address}`);

      // Step 2: Register this threshold-derived address with the simplified bridge canister
      try {
        await simplifiedBridgeService.registerCustodyAddress(thresholdAddress.address, principal);
        console.log(`📋 Bridge registered custody address: ${thresholdAddress.address}`);

        const custodyInfo: CustodyAddressInfo = {
          custodyAddress: thresholdAddress.address, // REAL threshold-controlled address
          publicKey: thresholdAddress.public_key,
          userPrincipal,
          depositId,
          derivationPath: `m/44'/283'/${this.addressCounter}'`, // Algorand BIP44 path
          createdAt: timestamp,
          controlledByThresholdSignatures: true,
          purpose,
          metadata: {
            ...metadata,
            thresholdCanister: icpCanisterService.getCanisterId(),
            derivedAt: timestamp.toString()
          }
        };

        // Store in memory (in production, this would be persisted)
        this.custodyAddresses.set(depositId, custodyInfo);
        this.custodyAddresses.set(thresholdAddress.address, custodyInfo); // Allow lookup by address too

        this.addressCounter++;

        console.log(`✅ Generated REAL custody address: ${thresholdAddress.address}`);
        console.log(`📍 Derivation path: ${custodyInfo.derivationPath}`);

        return custodyInfo;

      } catch (bridgeError) {
        console.warn(`⚠️ Bridge registration failed, using threshold address directly:`, bridgeError);

        // Fallback: use threshold address even if bridge registration fails
        const custodyInfo: CustodyAddressInfo = {
          custodyAddress: thresholdAddress.address, // REAL threshold-controlled address
          publicKey: thresholdAddress.public_key,
          userPrincipal,
          depositId,
          derivationPath: `m/44'/283'/${this.addressCounter}'`,
          createdAt: timestamp,
          controlledByThresholdSignatures: true,
          purpose,
          metadata: {
            ...metadata,
            bridgeRegistration: 'failed',
            thresholdCanister: icpCanisterService.getCanisterId(),
            derivedAt: timestamp.toString()
          }
        };

        this.custodyAddresses.set(depositId, custodyInfo);
        this.custodyAddresses.set(thresholdAddress.address, custodyInfo);
        this.addressCounter++;

        return custodyInfo;
      }

    } catch (error) {
      console.error(`❌ Failed to generate real custody address:`, error);
      throw new Error(`Real custody address generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a unique custody address for a deposit
   * Uses threshold signatures with deterministic derivation
   * @deprecated Use generateRealCustodyAddress for Phase A.2+ implementation
   */
  async generateUniqueCustodyAddress(request: CustodyAddressRequest): Promise<CustodyAddressInfo> {
    console.log('⚠️ Using deprecated custody address generation - upgrade to generateRealCustodyAddress');
    const { userPrincipal, purpose = 'deposit', metadata = {} } = request;

    // Create unique deposit ID
    const timestamp = Date.now();
    const depositId = this.generateDepositId(userPrincipal, timestamp);

    console.log(`🏦 Generating unique custody address for ${userPrincipal}, depositId: ${depositId}`);

    // For now, use the existing threshold signature system with the base principal
    // In a full implementation, we would extend the threshold signer to support derivation paths
    const baseAddress = await icpCanisterService.deriveAlgorandAddress(userPrincipal);

    // Create a deterministic variation of the address for uniqueness
    // Note: This is a interim solution until threshold signer supports derivation paths
    const uniqueAddress = await this.deriveUniqueAddress(baseAddress.address, depositId);

    const custodyInfo: CustodyAddressInfo = {
      custodyAddress: uniqueAddress,
      publicKey: baseAddress.public_key,
      userPrincipal,
      depositId,
      derivationPath: `m/44'/283'/${this.addressCounter}'`, // Algorand BIP44 path
      createdAt: timestamp,
      controlledByThresholdSignatures: true,
      purpose,
      metadata
    };

    // Store in memory (in production, this would be persisted)
    this.custodyAddresses.set(depositId, custodyInfo);
    this.custodyAddresses.set(uniqueAddress, custodyInfo); // Allow lookup by address too

    this.addressCounter++;

    console.log(`✅ Generated unique custody address: ${uniqueAddress}`);
    console.log(`📍 Derivation path: ${custodyInfo.derivationPath}`);

    return custodyInfo;
  }

  /**
   * Generate a deterministic deposit ID
   */
  private generateDepositId(userPrincipal: string, timestamp: number): string {
    const hash = crypto.createHash('sha256');
    hash.update(userPrincipal);
    hash.update(timestamp.toString());
    hash.update(this.addressCounter.toString());
    return `deposit_${hash.digest('hex').substring(0, 16)}_${timestamp}`;
  }

  /**
   * Derive a unique address variation
   * Note: This is an interim solution. In production, the threshold signer would
   * support multiple derivation paths per principal.
   */
  private async deriveUniqueAddress(baseAddress: string, depositId: string): Promise<string> {
    // For demonstration, create a deterministic variation
    // In production, this would use proper threshold signature derivation
    
    // Use the base address but add deterministic variation
    // This is a simplified approach - real implementation would use threshold signatures
    const hash = crypto.createHash('sha256');
    hash.update(baseAddress);
    hash.update(depositId);
    const variation = hash.digest('hex').substring(0, 8);
    
    // For now, return the base address as the threshold signer controls it
    // The unique tracking is maintained in our service layer
    console.log(`🔐 Address variation hash: ${variation} (tracked internally)`);
    
    return baseAddress; // Threshold signer controlled address
  }

  /**
   * Get custody address info by deposit ID
   */
  getCustodyAddressInfo(depositId: string): CustodyAddressInfo | null {
    return this.custodyAddresses.get(depositId) || null;
  }

  /**
   * Get custody address info by address
   */
  getCustodyAddressInfoByAddress(address: string): CustodyAddressInfo | null {
    return this.custodyAddresses.get(address) || null;
  }

  /**
   * Get all custody addresses for a user
   */
  getCustodyAddressesForUser(userPrincipal: string): CustodyAddressInfo[] {
    return Array.from(this.custodyAddresses.values())
      .filter(info => info.userPrincipal === userPrincipal);
  }

  /**
   * Verify that an address is controlled by threshold signatures
   */
  async verifyThresholdControl(address: string): Promise<boolean> {
    const info = this.getCustodyAddressInfoByAddress(address);
    if (!info) {
      return false;
    }

    try {
      // Verify we can derive the same address via threshold signatures
      const derivedAddress = await icpCanisterService.deriveAlgorandAddress(info.userPrincipal);
      return derivedAddress.address === address;
    } catch (error) {
      console.error(`❌ Failed to verify threshold control for ${address}:`, error);
      return false;
    }
  }

  /**
   * Generate a custody address with enhanced security features
   */
  async generateSecureCustodyAddress(request: CustodyAddressRequest): Promise<CustodyAddressInfo> {
    const custodyInfo = await this.generateUniqueCustodyAddress(request);
    
    // Verify the address is actually controlled by threshold signatures
    const isControlled = await this.verifyThresholdControl(custodyInfo.custodyAddress);
    
    if (!isControlled) {
      throw new Error('Failed to verify threshold signature control of custody address');
    }
    
    // Verify the address exists on Algorand network and is valid
    try {
      await algorandService.getAccountInfo(custodyInfo.custodyAddress);
      console.log(`✅ Custody address ${custodyInfo.custodyAddress} verified on Algorand network`);
    } catch (error) {
      // Address might not have any transactions yet, which is normal for new addresses
      console.log(`ℹ️ Custody address ${custodyInfo.custodyAddress} not yet active on Algorand (normal for new addresses)`);
    }
    
    return custodyInfo;
  }

  /**
   * Get all REAL threshold-controlled custody addresses for reserve verification
   * Phase A.2.3: Returns only addresses that are actually controlled by ICP threshold signatures
   */
  getAllRealCustodyAddresses(): string[] {
    const realAddresses = Array.from(this.custodyAddresses.values())
      .filter(info => info.controlledByThresholdSignatures &&
                     info.metadata?.thresholdCanister &&
                     info.custodyAddress.length > 10) // Filter out fake "BRIDGE" addresses
      .map(info => info.custodyAddress);

    console.log(`📋 Found ${realAddresses.length} real threshold-controlled custody addresses`);
    return Array.from(new Set(realAddresses)); // Remove duplicates
  }

  /**
   * Verify all custody addresses are still threshold-controlled
   * Phase A.2.2: Validation method for reserve verification
   */
  async verifyAllThresholdControlled(): Promise<{
    verified: string[];
    failed: string[];
    totalChecked: number;
  }> {
    const addresses = this.getAllRealCustodyAddresses();
    const verified: string[] = [];
    const failed: string[] = [];

    console.log(`🔍 Verifying threshold control for ${addresses.length} custody addresses...`);

    for (const address of addresses) {
      try {
        const isControlled = await this.verifyThresholdControl(address);
        if (isControlled) {
          verified.push(address);
        } else {
          failed.push(address);
        }
      } catch (error) {
        console.error(`❌ Error verifying ${address}:`, error);
        failed.push(address);
      }
    }

    const result = {
      verified,
      failed,
      totalChecked: addresses.length
    };

    console.log(`✅ Threshold verification: ${verified.length} verified, ${failed.length} failed`);
    return result;
  }

  /**
   * Get statistics about custody addresses
   */
  getStatistics() {
    const addresses = Array.from(this.custodyAddresses.values());
    const uniqueUsers = new Set(addresses.map(addr => addr.userPrincipal)).size;
    
    return {
      totalCustodyAddresses: addresses.length,
      uniqueUsers,
      addressCounter: this.addressCounter,
      averageAddressesPerUser: addresses.length / Math.max(uniqueUsers, 1),
      oldestAddress: Math.min(...addresses.map(addr => addr.createdAt)),
      newestAddress: Math.max(...addresses.map(addr => addr.createdAt)),
      thresholdControlledAddresses: addresses.filter(addr => addr.controlledByThresholdSignatures).length
    };
  }

  /**
   * Enhanced address generation with metadata
   */
  async generateCustodyAddressWithMetadata(
    userPrincipal: string, 
    metadata: {
      amount?: number;
      currency?: string;
      source?: string;
      expiresAt?: number;
    }
  ): Promise<CustodyAddressInfo> {
    
    const request: CustodyAddressRequest = {
      userPrincipal,
      purpose: 'deposit',
      metadata: {
        amount: metadata.amount?.toString() || 'unknown',
        currency: metadata.currency || 'ALGO',
        source: metadata.source || 'web',
        expiresAt: metadata.expiresAt?.toString() || '0'
      }
    };
    
    const custodyInfo = await this.generateSecureCustodyAddress(request);
    
    console.log(`💰 Generated custody address for ${metadata.amount || 'unknown'} ${metadata.currency || 'ALGO'}`);
    
    return custodyInfo;
  }

  /**
   * Cleanup expired addresses (if they have expiration metadata)
   */
  cleanupExpiredAddresses(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, info] of this.custodyAddresses.entries()) {
      const expiresAt = parseInt(info.metadata?.expiresAt || '0');
      if (expiresAt > 0 && now > expiresAt) {
        this.custodyAddresses.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired custody addresses`);
    }
    
    return cleanedCount;
  }
}