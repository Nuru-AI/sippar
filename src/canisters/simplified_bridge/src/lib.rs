// Simplified Bridge Canister - Sprint X Architecture Fix
// Core Bridge Functionality Only (<500 lines vs 68k+ monolithic)

use ic_cdk::{init, query, update, caller, api::time, pre_upgrade, post_upgrade};
use candid::{CandidType, Principal, Nat, Deserialize};
use std::collections::HashMap;
use std::cell::RefCell;
use serde::Serialize;
use num_traits::cast::ToPrimitive;

// ============================================================================
// SIMPLIFIED DATA STRUCTURES - Core Bridge Only
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct PendingDeposit {
    pub user: Principal,
    pub algorand_tx_id: String,
    pub amount: Nat,
    pub timestamp: u64,
    pub confirmations: u8,
    pub required_confirmations: u8,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct DepositRecord {
    pub deposit_id: String,
    pub user: Principal,
    pub custody_address: String,
    pub amount: Nat,
    pub algorand_tx_id: String,
    pub confirmed_at: u64,
    pub minted_ck_algo: Nat,
}

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct ReserveStatus {
    pub locked_algo_reserves: Nat,
    pub total_ck_algo_supply: Nat,
    pub reserve_ratio: f64,
    pub is_healthy: bool,
    pub last_verification: u64,
}

// CRITICAL FIX 2: Stable storage structure for canister upgrades
#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct StableStorage {
    pub pending_deposits: Vec<(String, PendingDeposit)>,
    pub deposit_records: Vec<DepositRecord>,
    pub deposit_addresses: Vec<(String, Principal)>,
    pub balances: Vec<(String, Nat)>,
    pub total_supply: Nat,
    pub locked_algo_reserves: Nat,
    pub authorized_minters: Vec<Principal>,
    pub reserve_health_status: bool,
    pub last_reserve_check: u64,
}

// ============================================================================
// SIMPLIFIED GLOBAL STATE - Core Bridge Only
// ============================================================================

thread_local! {
    // Core ICRC-1 token state
    static BALANCES: RefCell<HashMap<String, Nat>> = RefCell::new(HashMap::new());
    static TOTAL_SUPPLY: RefCell<Nat> = RefCell::new(Nat::from(0u64));
    static TOKEN_NAME: RefCell<String> = RefCell::new("Chain-Key ALGO".to_string());
    static TOKEN_SYMBOL: RefCell<String> = RefCell::new("ckALGO".to_string());
    static DECIMALS: RefCell<u8> = RefCell::new(6u8);
    static FEE: RefCell<Nat> = RefCell::new(Nat::from(10000u64));
    static AUTHORIZED_MINTERS: RefCell<Vec<Principal>> = RefCell::new(Vec::new());
    
    // Bridge-specific state
    static DEPOSIT_ADDRESSES: RefCell<HashMap<String, Principal>> = RefCell::new(HashMap::new());
    static LOCKED_ALGO_RESERVES: RefCell<Nat> = RefCell::new(Nat::from(0u64));
    static PENDING_DEPOSITS: RefCell<HashMap<String, PendingDeposit>> = RefCell::new(HashMap::new());
    static DEPOSIT_RECORDS: RefCell<Vec<DepositRecord>> = RefCell::new(Vec::new());
    
    // Reserve verification
    static LAST_RESERVE_CHECK: RefCell<u64> = RefCell::new(0u64);
    static RESERVE_HEALTH_STATUS: RefCell<bool> = RefCell::new(true);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

#[init]
fn init() {
    // Initialize token parameters
    TOKEN_NAME.with(|name| *name.borrow_mut() = "Chain-Key ALGO".to_string());
    TOKEN_SYMBOL.with(|symbol| *symbol.borrow_mut() = "ckALGO".to_string());
    DECIMALS.with(|decimals| *decimals.borrow_mut() = 6u8);
    FEE.with(|fee| *fee.borrow_mut() = Nat::from(10000u64));
    
    // Initialize authorized minters
    AUTHORIZED_MINTERS.with(|minters| {
        let mut minters_vec = minters.borrow_mut();
        minters_vec.push(Principal::management_canister());
        // Add backend principal from Sprint 012.5
        let backend_principal = Principal::from_text("2vxsx-fae").unwrap();
        minters_vec.push(backend_principal);
    });
    
    // Initialize reserve state
    LOCKED_ALGO_RESERVES.with(|reserves| *reserves.borrow_mut() = Nat::from(0u64));
    RESERVE_HEALTH_STATUS.with(|health| *health.borrow_mut() = true);
}

// CRITICAL FIX 2: Stable storage for canister upgrades
// Save all state before upgrade to prevent data loss
#[pre_upgrade]
fn pre_upgrade() {
    let stable_data = StableStorage {
        pending_deposits: PENDING_DEPOSITS.with(|deposits| {
            deposits.borrow().iter().map(|(k, v)| (k.clone(), v.clone())).collect()
        }),
        deposit_records: DEPOSIT_RECORDS.with(|records| records.borrow().clone()),
        deposit_addresses: DEPOSIT_ADDRESSES.with(|addresses| {
            addresses.borrow().iter().map(|(k, v)| (k.clone(), *v)).collect()
        }),
        balances: BALANCES.with(|balances| {
            balances.borrow().iter().map(|(k, v)| (k.clone(), v.clone())).collect()
        }),
        total_supply: TOTAL_SUPPLY.with(|supply| supply.borrow().clone()),
        locked_algo_reserves: LOCKED_ALGO_RESERVES.with(|reserves| reserves.borrow().clone()),
        authorized_minters: AUTHORIZED_MINTERS.with(|minters| minters.borrow().clone()),
        reserve_health_status: RESERVE_HEALTH_STATUS.with(|health| *health.borrow()),
        last_reserve_check: LAST_RESERVE_CHECK.with(|check| *check.borrow()),
    };

    // Store in stable memory
    ic_cdk::storage::stable_save((stable_data,))
        .expect("Failed to save state to stable memory");
}

// CRITICAL FIX 2: Restore all state after upgrade
#[post_upgrade]
fn post_upgrade() {
    // Restore from stable memory
    let (stable_data,): (StableStorage,) = ic_cdk::storage::stable_restore()
        .expect("Failed to restore state from stable memory");

    // Restore all state
    PENDING_DEPOSITS.with(|deposits| {
        let mut deposits_map = deposits.borrow_mut();
        deposits_map.clear();
        for (k, v) in stable_data.pending_deposits {
            deposits_map.insert(k, v);
        }
    });

    DEPOSIT_RECORDS.with(|records| {
        *records.borrow_mut() = stable_data.deposit_records;
    });

    DEPOSIT_ADDRESSES.with(|addresses| {
        let mut addresses_map = addresses.borrow_mut();
        addresses_map.clear();
        for (k, v) in stable_data.deposit_addresses {
            addresses_map.insert(k, v);
        }
    });

    BALANCES.with(|balances| {
        let mut balances_map = balances.borrow_mut();
        balances_map.clear();
        for (k, v) in stable_data.balances {
            balances_map.insert(k, v);
        }
    });

    TOTAL_SUPPLY.with(|supply| {
        *supply.borrow_mut() = stable_data.total_supply;
    });

    LOCKED_ALGO_RESERVES.with(|reserves| {
        *reserves.borrow_mut() = stable_data.locked_algo_reserves;
    });

    AUTHORIZED_MINTERS.with(|minters| {
        *minters.borrow_mut() = stable_data.authorized_minters;
    });

    RESERVE_HEALTH_STATUS.with(|health| {
        *health.borrow_mut() = stable_data.reserve_health_status;
    });

    LAST_RESERVE_CHECK.with(|check| {
        *check.borrow_mut() = stable_data.last_reserve_check;
    });

    // Ensure backend authorization persists
    AUTHORIZED_MINTERS.with(|minters| {
        let mut minters_vec = minters.borrow_mut();
        let backend_principal = Principal::from_text("2vxsx-fae").unwrap();
        if !minters_vec.contains(&backend_principal) {
            minters_vec.push(backend_principal);
        }
    });
}

// ============================================================================
// ICRC-1 STANDARD METHODS
// ============================================================================

#[query]
fn icrc1_name() -> String {
    TOKEN_NAME.with(|name| name.borrow().clone())
}

#[query]
fn icrc1_symbol() -> String {
    TOKEN_SYMBOL.with(|symbol| symbol.borrow().clone())
}

#[query]
fn icrc1_decimals() -> u8 {
    DECIMALS.with(|decimals| *decimals.borrow())
}

#[query]
fn icrc1_fee() -> Nat {
    FEE.with(|fee| fee.borrow().clone())
}

#[query]
fn icrc1_total_supply() -> Nat {
    TOTAL_SUPPLY.with(|supply| supply.borrow().clone())
}

#[query]
fn icrc1_balance_of(account: Principal) -> Nat {
    let account_str = account.to_text();
    BALANCES.with(|balances| {
        balances.borrow().get(&account_str).unwrap_or(&Nat::from(0u64)).clone()
    })
}

#[query]
fn icrc1_supported_standards() -> Vec<(String, String)> {
    vec![
        ("ICRC-1".to_string(), "https://github.com/dfinity/ICRC-1".to_string()),
    ]
}

#[update]
fn icrc1_transfer(to: Principal, amount: Nat) -> Result<Nat, String> {
    let from = caller();
    let from_str = from.to_text();
    let to_str = to.to_text();
    
    // Check balance
    let current_balance = BALANCES.with(|balances| {
        balances.borrow().get(&from_str).unwrap_or(&Nat::from(0u64)).clone()
    });
    
    if current_balance < amount {
        return Err("Insufficient balance".to_string());
    }
    
    // Update balances
    BALANCES.with(|balances| {
        let mut balances_map = balances.borrow_mut();
        let new_from_balance = current_balance.clone() - amount.clone();
        balances_map.insert(from_str, new_from_balance);
        
        let current_to_balance = balances_map.get(&to_str).unwrap_or(&Nat::from(0u64)).clone();
        let new_to_balance = current_to_balance + amount.clone();
        balances_map.insert(to_str, new_to_balance);
    });
    
    Ok(Nat::from(time()))
}

// ============================================================================
// BRIDGE CORE FUNCTIONS
// ============================================================================

// REMOVED: generate_deposit_address — returned fake "BRIDGE..." strings.
// Real Algorand custody addresses are derived by threshold_signer canister
// (vj7ly-diaaa-aaaae-abvoq-cai) via derive_algorand_address().
// Use register_custody_address() to register a real threshold-derived address.

/// Admin function: register an existing custody address for a user
/// Authorized minters OR canister controllers can call this
#[update]
fn register_custody_address(custody_address: String, user: Principal) -> Result<String, String> {
    let caller_principal = caller();

    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller_principal)
    });

    // Also allow the canister controller (deploy identity)
    let is_controller = ic_cdk::api::is_controller(&caller_principal);

    if !is_authorized && !is_controller {
        return Err(format!("Unauthorized: only authorized minters or controllers can register custody addresses. Caller: {}", caller_principal));
    }

    DEPOSIT_ADDRESSES.with(|addresses| {
        addresses.borrow_mut().insert(custody_address.clone(), user);
    });

    Ok(format!("Custody address {} registered for user {}", custody_address, user.to_text()))
}

#[update]
async fn register_pending_deposit(
    user: Principal,
    algorand_tx_id: String,
    amount: Nat,
    custody_address: String,
    confirmations: u8
) -> Result<String, String> {
    let caller_principal = caller();

    // Check authorization - only authorized minters can register deposits
    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller_principal)
    });

    if !is_authorized {
        return Err(format!("Unauthorized: only authorized minters can register deposits. Caller: {}", caller_principal));
    }

    // CRITICAL FIX 1: Verify custody address belongs to the claimed user
    let address_owner = DEPOSIT_ADDRESSES.with(|addresses| {
        addresses.borrow().get(&custody_address).cloned()
    });

    match address_owner {
        Some(owner) if owner == user => {
            // Valid - custody address belongs to user
        },
        Some(owner) => {
            return Err(format!(
                "Security violation: Custody address {} belongs to {}, not {}",
                custody_address, owner.to_text(), user.to_text()
            ));
        },
        None => {
            return Err(format!("Unknown custody address: {}", custody_address));
        }
    }

    // CRITICAL FIX 3: Check BOTH pending and completed deposits for duplicates
    let already_pending = PENDING_DEPOSITS.with(|deposits| {
        deposits.borrow().contains_key(&algorand_tx_id)
    });

    let already_completed = DEPOSIT_RECORDS.with(|records| {
        records.borrow().iter().any(|r| r.algorand_tx_id == algorand_tx_id)
    });

    if already_pending || already_completed {
        return Err(format!("Deposit {} already processed", algorand_tx_id));
    }

    // Validate amount (must be > 0)
    if amount == Nat::from(0u64) {
        return Err("Deposit amount must be greater than 0".to_string());
    }

    // HIGH-PRIORITY FIX: Add minimum deposit validation (0.1 ALGO = 100,000 microALGO)
    const MIN_DEPOSIT_MICROALGOS: u64 = 100_000;
    const MAX_DEPOSIT_MICROALGOS: u64 = 1_000_000_000_000; // 1M ALGO

    let amount_u64 = amount.0.to_u64().ok_or("Amount too large to process")?;

    if amount_u64 < MIN_DEPOSIT_MICROALGOS {
        return Err(format!("Minimum deposit is 0.1 ALGO (100,000 microALGO). Got: {} microALGO", amount_u64));
    }

    if amount_u64 > MAX_DEPOSIT_MICROALGOS {
        return Err(format!("Maximum deposit is 1M ALGO. Got: {} microALGO", amount_u64));
    }

    // HIGH-PRIORITY FIX: Add max pending deposits cap to prevent spam attacks
    const MAX_PENDING_DEPOSITS: usize = 10_000;

    let pending_count = PENDING_DEPOSITS.with(|deposits| deposits.borrow().len());
    if pending_count >= MAX_PENDING_DEPOSITS {
        return Err(format!("Maximum pending deposits limit reached ({}). Please wait for confirmations.", MAX_PENDING_DEPOSITS));
    }

    // HIGH-PRIORITY FIX: Clarify that confirmations parameter is REQUIRED confirmations
    // Validate required confirmations (3 for testnet, 6 for mainnet)
    let required_confirmations = confirmations;
    if required_confirmations != 3 && required_confirmations != 6 {
        return Err(format!("Invalid required_confirmations: {} (must be 3 for testnet or 6 for mainnet)", required_confirmations));
    }

    // Create pending deposit record
    let pending_deposit = PendingDeposit {
        user,
        algorand_tx_id: algorand_tx_id.clone(),
        amount: amount.clone(),
        timestamp: time(),
        confirmations: 0, // Will be updated as confirmations increase
        required_confirmations,
    };

    // Store in pending deposits
    PENDING_DEPOSITS.with(|deposits| {
        deposits.borrow_mut().insert(algorand_tx_id.clone(), pending_deposit);
    });

    // Also track the custody address mapping if not already present
    DEPOSIT_ADDRESSES.with(|addresses| {
        if !addresses.borrow().contains_key(&custody_address) {
            addresses.borrow_mut().insert(custody_address.clone(), user);
        }
    });

    Ok(format!("Deposit {} registered successfully for user {}", algorand_tx_id, user.to_text()))
}

#[update]
async fn mint_after_deposit_confirmed(deposit_tx_id: String) -> Result<Nat, String> {
    let caller_principal = caller();
    
    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller_principal)
    });
    let is_controller = ic_cdk::api::is_controller(&caller_principal);
    
    if !is_authorized && !is_controller {
        return Err(format!("Unauthorized minting attempt from principal: {}", caller_principal));
    }
    
    // Check if deposit exists and is confirmed
    let deposit_opt = PENDING_DEPOSITS.with(|deposits| {
        deposits.borrow().get(&deposit_tx_id).cloned()
    });
    
    let deposit = match deposit_opt {
        Some(dep) if dep.confirmations >= dep.required_confirmations => dep,
        Some(_) => return Err("Deposit not yet confirmed".to_string()),
        None => return Err("Deposit not found".to_string()),
    };
    
    // Check reserve health before minting
    let reserve_healthy = RESERVE_HEALTH_STATUS.with(|health| *health.borrow());
    if !reserve_healthy {
        return Err("Cannot mint: reserve system unhealthy".to_string());
    }
    
    // Mint ckALGO tokens
    let user_str = deposit.user.to_text();
    BALANCES.with(|balances| {
        let mut balances_map = balances.borrow_mut();
        let current_balance = balances_map.get(&user_str).unwrap_or(&Nat::from(0u64)).clone();
        let new_balance = current_balance + deposit.amount.clone();
        balances_map.insert(user_str, new_balance);
    });
    
    // Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let mut total = supply.borrow_mut();
        *total = total.clone() + deposit.amount.clone();
    });
    
    // Update locked reserves
    LOCKED_ALGO_RESERVES.with(|reserves| {
        let mut locked = reserves.borrow_mut();
        *locked = locked.clone() + deposit.amount.clone();
    });
    
    // Remove from pending deposits
    PENDING_DEPOSITS.with(|deposits| {
        deposits.borrow_mut().remove(&deposit_tx_id);
    });
    
    // Record the deposit
    let deposit_record = DepositRecord {
        deposit_id: deposit_tx_id,
        user: deposit.user,
        custody_address: "".to_string(), // Would be filled by backend
        amount: deposit.amount.clone(),
        algorand_tx_id: deposit.algorand_tx_id,
        confirmed_at: time(),
        minted_ck_algo: deposit.amount.clone(),
    };
    
    DEPOSIT_RECORDS.with(|records| {
        records.borrow_mut().push(deposit_record);
    });
    
    Ok(deposit.amount)
}

/// TEMPORARY ARCHITECTURE: Update deposit confirmations
///
/// SECURITY WARNING: This function trusts the authorized backend to report
/// accurate confirmation counts. In Phase 2, this will be replaced with
/// canister-side verification via HTTP outcalls (ckETH pattern).
///
/// Only authorized minters (backend principal 2vxsx-fae) can call this function.
#[update]
async fn update_deposit_confirmations(
    algorand_tx_id: String,
    confirmations: u8
) -> Result<String, String> {
    let caller_principal = caller();

    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller_principal)
    });
    let is_controller = ic_cdk::api::is_controller(&caller_principal);

    if !is_authorized && !is_controller {
        return Err(format!(
            "Unauthorized: only authorized minters or controllers can update confirmations. Caller: {}",
            caller_principal
        ));
    }

    // Update confirmations in pending deposits
    PENDING_DEPOSITS.with(|deposits| {
        if let Some(deposit) = deposits.borrow_mut().get_mut(&algorand_tx_id) {
            deposit.confirmations = confirmations;
            Ok(format!(
                "Updated deposit {} to {} confirmations (required: {})",
                algorand_tx_id, confirmations, deposit.required_confirmations
            ))
        } else {
            Err(format!("Deposit {} not found in pending deposits", algorand_tx_id))
        }
    })
}

#[update]
async fn redeem_ck_algo(amount: Nat, _destination: String) -> Result<String, String> {
    let user = caller();
    let user_str = user.to_text();

    // Check balance
    let current_balance = BALANCES.with(|balances| {
        balances.borrow().get(&user_str).unwrap_or(&Nat::from(0u64)).clone()
    });

    if current_balance < amount {
        return Err("Insufficient ckALGO balance".to_string());
    }

    // Check reserve health
    let reserve_healthy = RESERVE_HEALTH_STATUS.with(|health| *health.borrow());
    if !reserve_healthy {
        return Err("Cannot redeem: reserve system unhealthy".to_string());
    }

    // Burn ckALGO tokens
    BALANCES.with(|balances| {
        let mut balances_map = balances.borrow_mut();
        let new_balance = current_balance.clone() - amount.clone();
        balances_map.insert(user_str, new_balance);
    });

    // Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let mut total = supply.borrow_mut();
        *total = total.clone() - amount.clone();
    });

    // Update locked reserves
    LOCKED_ALGO_RESERVES.with(|reserves| {
        let mut locked = reserves.borrow_mut();
        *locked = locked.clone() - amount.clone();
    });

    // Return withdrawal transaction ID (would be generated by backend)
    Ok(format!("WITHDRAW_{}", time()))
}

/// Admin function: redeem ckALGO on behalf of a user
/// Used by backend to process redemption requests (burns user's tokens)
/// Only authorized minters or controllers can call this function
#[update]
async fn admin_redeem_ck_algo(
    user: Principal,
    amount: Nat,
    destination: String
) -> Result<String, String> {
    let caller_principal = caller();

    // Check authorization
    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller_principal)
    });
    let is_controller = ic_cdk::api::is_controller(&caller_principal);

    if !is_authorized && !is_controller {
        return Err(format!(
            "Unauthorized: only authorized minters or controllers can redeem on behalf of users. Caller: {}",
            caller_principal
        ));
    }

    let user_str = user.to_text();

    // Check user's balance
    let current_balance = BALANCES.with(|balances| {
        balances.borrow().get(&user_str).unwrap_or(&Nat::from(0u64)).clone()
    });

    if current_balance < amount {
        return Err(format!(
            "Insufficient ckALGO balance for user {}: has {}, requested {}",
            user_str, current_balance, amount
        ));
    }

    // Check reserve health
    let reserve_healthy = RESERVE_HEALTH_STATUS.with(|health| *health.borrow());
    if !reserve_healthy {
        return Err("Cannot redeem: reserve system unhealthy".to_string());
    }

    // Burn ckALGO tokens from user's balance
    BALANCES.with(|balances| {
        let mut balances_map = balances.borrow_mut();
        let new_balance = current_balance.clone() - amount.clone();
        balances_map.insert(user_str.clone(), new_balance);
    });

    // Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let mut total = supply.borrow_mut();
        *total = total.clone() - amount.clone();
    });

    // Update locked reserves
    LOCKED_ALGO_RESERVES.with(|reserves| {
        let mut locked = reserves.borrow_mut();
        *locked = locked.clone() - amount.clone();
    });

    // Return redemption ID with destination for tracking
    Ok(format!("REDEEM_{}_{}", time(), destination))
}

/// Admin function: transfer ckALGO from one principal to another
/// Used by backend for X402 payments (transfers user's tokens to treasury)
/// Only authorized minters or controllers can call this function
#[update]
fn admin_transfer_ck_algo(
    from_principal: Principal,
    to_principal: Principal,
    amount: Nat
) -> Result<Nat, String> {
    let caller_principal = caller();

    // Check authorization
    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller_principal)
    });
    let is_controller = ic_cdk::api::is_controller(&caller_principal);

    if !is_authorized && !is_controller {
        return Err(format!(
            "Unauthorized: only authorized minters or controllers can perform admin transfers. Caller: {}",
            caller_principal
        ));
    }

    let from_str = from_principal.to_text();
    let to_str = to_principal.to_text();

    // Check sender's balance
    let from_balance = BALANCES.with(|balances| {
        balances.borrow().get(&from_str).unwrap_or(&Nat::from(0u64)).clone()
    });

    if from_balance < amount {
        return Err(format!(
            "Insufficient balance for principal {}: has {}, requested {}",
            from_str, from_balance, amount
        ));
    }

    // Perform transfer: deduct from sender, add to receiver
    BALANCES.with(|balances| {
        let mut balances_map = balances.borrow_mut();

        // Deduct from sender
        let new_from_balance = from_balance.clone() - amount.clone();
        balances_map.insert(from_str.clone(), new_from_balance);

        // Add to receiver
        let to_balance = balances_map.get(&to_str).unwrap_or(&Nat::from(0u64)).clone();
        let new_to_balance = to_balance + amount.clone();
        balances_map.insert(to_str, new_to_balance);
    });

    // Return transfer timestamp as transaction index
    Ok(Nat::from(time()))
}

#[query]
fn get_reserve_ratio() -> ReserveStatus {
    let locked_reserves = LOCKED_ALGO_RESERVES.with(|reserves| reserves.borrow().clone());
    let total_supply = TOTAL_SUPPLY.with(|supply| supply.borrow().clone());
    let is_healthy = RESERVE_HEALTH_STATUS.with(|health| *health.borrow());
    let last_check = LAST_RESERVE_CHECK.with(|check| *check.borrow());
    
    let ratio = if total_supply > Nat::from(0u64) {
        // Convert to f64 for ratio calculation
        let locked_f64 = locked_reserves.0.to_f64().unwrap_or(0.0);
        let supply_f64 = total_supply.0.to_f64().unwrap_or(1.0);
        locked_f64 / supply_f64
    } else {
        1.0
    };
    
    ReserveStatus {
        locked_algo_reserves: locked_reserves,
        total_ck_algo_supply: total_supply,
        reserve_ratio: ratio,
        is_healthy,
        last_verification: last_check,
    }
}

#[query]
fn get_user_deposits(user: Principal) -> Vec<DepositRecord> {
    DEPOSIT_RECORDS.with(|records| {
        records.borrow()
            .iter()
            .filter(|record| record.user == user)
            .cloned()
            .collect()
    })
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

#[update]
fn update_reserve_health(is_healthy: bool) -> Result<String, String> {
    let caller_principal = caller();
    
    // Check authorization
    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller_principal)
    });
    
    if !is_authorized {
        return Err("Unauthorized".to_string());
    }
    
    RESERVE_HEALTH_STATUS.with(|health| {
        *health.borrow_mut() = is_healthy;
    });
    
    LAST_RESERVE_CHECK.with(|check| {
        *check.borrow_mut() = time();
    });
    
    Ok(format!("Reserve health updated to: {}", is_healthy))
}

#[query]
fn get_canister_status() -> String {
    let reserve_status = get_reserve_ratio();
    let total_deposits = DEPOSIT_RECORDS.with(|records| records.borrow().len());
    let pending_deposits = PENDING_DEPOSITS.with(|pending| pending.borrow().len());
    
    format!(
        "Simplified Bridge Status: {} deposits, {} pending, {:.2}% reserve ratio, healthy: {}",
        total_deposits,
        pending_deposits,
        reserve_status.reserve_ratio * 100.0,
        reserve_status.is_healthy
    )
}