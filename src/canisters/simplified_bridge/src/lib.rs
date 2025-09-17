// Simplified Bridge Canister - Sprint X Architecture Fix
// Core Bridge Functionality Only (<500 lines vs 68k+ monolithic)

use ic_cdk::{init, query, update, caller, api::time};
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

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    // Ensure backend authorization persists after upgrade
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

#[update]
async fn generate_deposit_address(user: Principal) -> Result<String, String> {
    // In real implementation, this would use threshold signatures to generate
    // a unique Algorand address controlled by the ICP subnet
    let user_id = user.to_text();
    let deposit_address = format!("BRIDGE{}", &user_id[..10].to_uppercase());
    
    DEPOSIT_ADDRESSES.with(|addresses| {
        addresses.borrow_mut().insert(deposit_address.clone(), user);
    });
    
    Ok(deposit_address)
}

#[update]
async fn mint_after_deposit_confirmed(deposit_tx_id: String) -> Result<Nat, String> {
    let caller_principal = caller();
    
    // Check authorization
    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller_principal)
    });
    
    if !is_authorized {
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