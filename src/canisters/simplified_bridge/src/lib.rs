// Simplified Bridge Canister - Sprint X Architecture Fix
// Core Bridge Functionality Only (<500 lines vs 68k+ monolithic)

use ic_cdk::{init, query, update, caller, api::time, pre_upgrade, post_upgrade};
use candid::{CandidType, Principal, Nat, Deserialize};
use std::collections::{HashMap, HashSet};
use std::cell::RefCell;
use serde::Serialize;
use num_traits::cast::ToPrimitive;
use sha2::{Sha256, Digest};

// ============================================================================
// ICRC-2 TYPES (defined manually to avoid dependency conflicts)
// ============================================================================

/// ICRC-1 Account structure
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

/// ICRC-2 TransferFrom arguments
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct TransferFromArgs {
    pub spender_subaccount: Option<[u8; 32]>,
    pub from: Account,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

/// ICRC-2 TransferFrom error types
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum TransferFromError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    InsufficientAllowance { allowance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

/// ICRC-1 Transfer arguments (for admin ckETH sweep)
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct TransferArgs {
    pub from_subaccount: Option<[u8; 32]>,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

/// ICRC-1 Transfer error types
#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum TransferError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

// ============================================================================
// CANISTER IDs
// ============================================================================

const CKETH_CANISTER_ID: &str = "ss2fx-dyaaa-aaaar-qacoq-cai";
const XRC_CANISTER_ID: &str = "uf6dk-hyaaa-aaaaq-qaaaq-cai";

// ============================================================================
// EXCHANGE RATE CANISTER (XRC) TYPES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum AssetClass {
    Cryptocurrency,
    FiatCurrency,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct Asset {
    pub symbol: String,
    pub class: AssetClass,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct GetExchangeRateRequest {
    pub base_asset: Asset,
    pub quote_asset: Asset,
    pub timestamp: Option<u64>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct ExchangeRateMetadata {
    pub decimals: u32,
    pub base_asset_num_received_rates: u64,
    pub base_asset_num_queried_sources: u64,
    pub quote_asset_num_received_rates: u64,
    pub quote_asset_num_queried_sources: u64,
    pub standard_deviation: u64,
    pub forex_timestamp: Option<u64>,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct ExchangeRate {
    pub base_asset: Asset,
    pub quote_asset: Asset,
    pub timestamp: u64,
    pub rate: u64,
    pub metadata: ExchangeRateMetadata,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum ExchangeRateError {
    AnonymousPrincipalNotAllowed,
    Pending,
    CryptoQuoteAssetNotFound,
    CryptoBaseAssetNotFound,
    StablecoinRateTooFewRates,
    StablecoinRateZeroRate,
    StablecoinRateNotFound,
    ForexInvalidTimestamp,
    ForexBaseAssetNotFound,
    ForexQuoteAssetNotFound,
    ForexAssetsNotFound,
    RateLimited,
    NotEnoughCycles,
    FailedToAcceptCycles,
    InconsistentRatesReceived,
    Other { code: u32, description: String },
}

pub type GetExchangeRateResult = Result<ExchangeRate, ExchangeRateError>;

// ============================================================================
// SWAP DATA STRUCTURES
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, Serialize)]
pub struct SwapRecord {
    pub user: Principal,
    pub cketh_in: Nat,
    pub ckalgo_out: Nat,
    pub rate_used: f64,       // ETH/ALGO rate at time of swap
    pub fee_collected: Nat,   // Fee in microALGO
    pub timestamp: u64,
    pub tx_id: String,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct SwapConfig {
    pub enabled: bool,
    pub fee_bps: u64,         // Fee in basis points (30 = 0.3%)
    pub min_cketh: Nat,       // Minimum swap amount (0.0001 ETH)
    pub max_cketh: Nat,       // Maximum swap amount (1 ETH)
    pub cketh_backed_ckalgo: Nat,   // Total ckALGO minted via swaps (not ALGO-backed)
    pub total_cketh_received: Nat,  // Total ckETH held by canister
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct SwapResult {
    pub cketh_in: Nat,
    pub ckalgo_out: Nat,
    pub rate_used: f64,
    pub cketh_block_index: Nat,
}

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
    // Swap state (added for ckETH → ckALGO swap feature)
    pub swap_enabled: Option<bool>,
    pub swap_fee_bps: Option<u64>,
    pub min_swap_cketh: Option<Nat>,
    pub max_swap_cketh: Option<Nat>,
    pub swap_records: Option<Vec<SwapRecord>>,
    pub cketh_backed_ckalgo: Option<Nat>,
    pub total_cketh_received: Option<Nat>,
    // Deposit-based swap tracking
    pub processed_swap_deposits: Option<Vec<String>>,
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

    // Swap state (ckETH → ckALGO)
    static SWAP_ENABLED: RefCell<bool> = RefCell::new(false);  // Disabled by default
    static SWAP_FEE_BPS: RefCell<u64> = RefCell::new(30);      // 0.3% fee
    static MIN_SWAP_CKETH: RefCell<Nat> = RefCell::new(Nat::from(100_000_000_000_000u64));      // 0.0001 ETH (18 decimals)
    static MAX_SWAP_CKETH: RefCell<Nat> = RefCell::new(Nat::from(1_000_000_000_000_000_000u64)); // 1 ETH (18 decimals)
    static SWAP_RECORDS: RefCell<Vec<SwapRecord>> = RefCell::new(Vec::new());
    // Reserve tracking: separate ckETH-backed vs ALGO-backed ckALGO
    static CKETH_BACKED_CKALGO: RefCell<Nat> = RefCell::new(Nat::from(0u64));  // Total ckALGO minted via swaps
    static TOTAL_CKETH_RECEIVED: RefCell<Nat> = RefCell::new(Nat::from(0u64)); // Total ckETH held by canister

    // Deposit-based swap tracking (anti-replay protection)
    static PROCESSED_SWAP_DEPOSITS: RefCell<HashSet<String>> = RefCell::new(HashSet::new());
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
        // Swap state
        swap_enabled: Some(SWAP_ENABLED.with(|e| *e.borrow())),
        swap_fee_bps: Some(SWAP_FEE_BPS.with(|f| *f.borrow())),
        min_swap_cketh: Some(MIN_SWAP_CKETH.with(|m| m.borrow().clone())),
        max_swap_cketh: Some(MAX_SWAP_CKETH.with(|m| m.borrow().clone())),
        swap_records: Some(SWAP_RECORDS.with(|r| r.borrow().clone())),
        cketh_backed_ckalgo: Some(CKETH_BACKED_CKALGO.with(|b| b.borrow().clone())),
        total_cketh_received: Some(TOTAL_CKETH_RECEIVED.with(|t| t.borrow().clone())),
        processed_swap_deposits: Some(PROCESSED_SWAP_DEPOSITS.with(|d| d.borrow().iter().cloned().collect())),
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

    // Restore swap state (with defaults for upgrades from older versions)
    if let Some(enabled) = stable_data.swap_enabled {
        SWAP_ENABLED.with(|e| *e.borrow_mut() = enabled);
    }
    if let Some(fee_bps) = stable_data.swap_fee_bps {
        SWAP_FEE_BPS.with(|f| *f.borrow_mut() = fee_bps);
    }
    if let Some(min_cketh) = stable_data.min_swap_cketh {
        MIN_SWAP_CKETH.with(|m| *m.borrow_mut() = min_cketh);
    }
    if let Some(max_cketh) = stable_data.max_swap_cketh {
        MAX_SWAP_CKETH.with(|m| *m.borrow_mut() = max_cketh);
    }
    if let Some(records) = stable_data.swap_records {
        SWAP_RECORDS.with(|r| *r.borrow_mut() = records);
    }
    if let Some(backed) = stable_data.cketh_backed_ckalgo {
        CKETH_BACKED_CKALGO.with(|b| *b.borrow_mut() = backed);
    }
    if let Some(received) = stable_data.total_cketh_received {
        TOTAL_CKETH_RECEIVED.with(|t| *t.borrow_mut() = received);
    }
    if let Some(deposits) = stable_data.processed_swap_deposits {
        PROCESSED_SWAP_DEPOSITS.with(|d| {
            let mut set = d.borrow_mut();
            for tx_id in deposits {
                set.insert(tx_id);
            }
        });
    }

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

/// Admin function: sweep ckETH from main canister account to user's custody subaccount
/// Used when user accidentally sends ckETH to main account instead of their custody subaccount
/// Only controllers can call this function
#[update]
async fn admin_sweep_cketh_to_custody(
    user_principal: Principal,
    amount: Nat
) -> Result<Nat, String> {
    let caller_principal = caller();

    // Only controllers can sweep (more restrictive than regular admin)
    if !ic_cdk::api::is_controller(&caller_principal) {
        return Err(format!(
            "Unauthorized: only controllers can sweep ckETH. Caller: {}",
            caller_principal
        ));
    }

    // Derive the user's custody subaccount
    let custody_subaccount = derive_custody_subaccount(&user_principal);

    // Get ckETH canister
    let cketh_canister = Principal::from_text(CKETH_CANISTER_ID)
        .map_err(|e| format!("Invalid ckETH canister ID: {}", e))?;

    // Build transfer args: from main account (no subaccount) to custody subaccount
    let transfer_args = TransferArgs {
        from_subaccount: None,  // From main account
        to: Account {
            owner: ic_cdk::api::id(),  // Same canister
            subaccount: Some(custody_subaccount),  // To custody subaccount
        },
        amount: amount.clone(),
        fee: None,
        memo: None,
        created_at_time: None,
    };

    // Inter-canister call to ckETH
    let transfer_result: Result<(Result<Nat, TransferError>,), _> =
        ic_cdk::call(cketh_canister, "icrc1_transfer", (transfer_args,)).await;

    match transfer_result {
        Ok((Ok(block_index),)) => {
            ic_cdk::println!(
                "Swept {} ckETH to custody subaccount for {}, block {}",
                amount, user_principal, block_index
            );
            Ok(block_index)
        }
        Ok((Err(e),)) => Err(format!("ckETH transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call failed: {:?} - {}", code, msg)),
    }
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

// ============================================================================
// SWAP FUNCTIONS (ckETH -> ckALGO)
// ============================================================================

/// Helper: Convert Nat to f64 for calculations
fn nat_to_f64(n: &Nat) -> f64 {
    n.0.to_f64().unwrap_or(0.0)
}

/// Get current ETH/ALGO exchange rate from the Exchange Rate Canister (XRC)
///
/// Returns ETH/ALGO rate (how many ALGO per 1 ETH)
/// NO FALLBACK: If XRC unavailable, reject the request
async fn get_eth_algo_rate() -> Result<f64, String> {
    let xrc_canister = Principal::from_text(XRC_CANISTER_ID)
        .map_err(|e| format!("Invalid XRC canister ID: {}", e))?;

    // Get ETH/USD rate
    let eth_usd_request = GetExchangeRateRequest {
        base_asset: Asset {
            symbol: "ETH".to_string(),
            class: AssetClass::Cryptocurrency,
        },
        quote_asset: Asset {
            symbol: "USD".to_string(),
            class: AssetClass::FiatCurrency,
        },
        timestamp: None,
    };

    // XRC requires cycles - send 1B cycles (1T = 1 ICP, 1B = 0.001 ICP)
    const XRC_CYCLES: u128 = 1_000_000_000; // 1B cycles

    let eth_usd_result: Result<(GetExchangeRateResult,), _> = ic_cdk::api::call::call_with_payment128(
        xrc_canister,
        "get_exchange_rate",
        (eth_usd_request,),
        XRC_CYCLES
    ).await;

    // Get ALGO/USD rate
    let algo_usd_request = GetExchangeRateRequest {
        base_asset: Asset {
            symbol: "ALGO".to_string(),
            class: AssetClass::Cryptocurrency,
        },
        quote_asset: Asset {
            symbol: "USD".to_string(),
            class: AssetClass::FiatCurrency,
        },
        timestamp: None,
    };

    let algo_usd_result: Result<(GetExchangeRateResult,), _> = ic_cdk::api::call::call_with_payment128(
        xrc_canister,
        "get_exchange_rate",
        (algo_usd_request,),
        XRC_CYCLES
    ).await;

    match (eth_usd_result, algo_usd_result) {
        (Ok((Ok(eth_rate),)), Ok((Ok(algo_rate),))) => {
            // XRC uses rate with decimals specified in metadata (typically 9)
            let eth_decimals = eth_rate.metadata.decimals;
            let algo_decimals = algo_rate.metadata.decimals;

            let eth_usd = eth_rate.rate as f64 / 10_f64.powi(eth_decimals as i32);
            let algo_usd = algo_rate.rate as f64 / 10_f64.powi(algo_decimals as i32);

            if algo_usd > 0.0 {
                // ETH/ALGO = (ETH/USD) / (ALGO/USD)
                Ok(eth_usd / algo_usd)
            } else {
                Err("ALGO/USD rate is zero".to_string())
            }
        }
        (Ok((Err(e),)), _) => {
            Err(format!("Failed to get ETH/USD rate: {:?}", e))
        }
        (_, Ok((Err(e),))) => {
            Err(format!("Failed to get ALGO/USD rate: {:?}", e))
        }
        (Err((code, msg)), _) => {
            Err(format!("XRC call failed for ETH/USD: {:?} - {}", code, msg))
        }
        (_, Err((code, msg))) => {
            Err(format!("XRC call failed for ALGO/USD: {:?} - {}", code, msg))
        }
    }
}

/// Swap ckETH for ckALGO
///
/// SECURITY: Only callable by authorized principals (backend, controllers)
///
/// Flow:
/// 1. Verify caller is authorized
/// 2. Verify swap is enabled and amount within limits
/// 3. Get current ETH/ALGO rate from XRC (NO fallback)
/// 4. Call ckETH.icrc2_transfer_from(user, this_canister, amount)
/// 5. Calculate ckALGO output (minus fee)
/// 6. Mint ckALGO to user
/// 7. Record swap, update reserves
#[update]
async fn swap_cketh_to_ckalgo(
    user: Principal,
    cketh_amount: Nat,
    min_ckalgo_out: Option<Nat>  // Slippage protection
) -> Result<SwapResult, String> {
    // Authorization check
    let caller_principal = caller();
    let is_authorized = AUTHORIZED_MINTERS.with(|m| m.borrow().contains(&caller_principal));
    let is_controller = ic_cdk::api::is_controller(&caller_principal);

    if !is_authorized && !is_controller {
        return Err(format!(
            "Unauthorized: only authorized minters can execute swaps. Caller: {}",
            caller_principal
        ));
    }

    // Check swap enabled
    let enabled = SWAP_ENABLED.with(|e| *e.borrow());
    if !enabled {
        return Err("Swaps are currently disabled".to_string());
    }

    // Validate amount within limits
    let min_swap = MIN_SWAP_CKETH.with(|m| m.borrow().clone());
    let max_swap = MAX_SWAP_CKETH.with(|m| m.borrow().clone());

    if cketh_amount < min_swap {
        return Err(format!(
            "Swap amount {} below minimum {} (0.0001 ETH)",
            cketh_amount, min_swap
        ));
    }
    if cketh_amount > max_swap {
        return Err(format!(
            "Swap amount {} exceeds maximum {} (1 ETH)",
            cketh_amount, max_swap
        ));
    }

    // Get exchange rate from XRC (NO FALLBACK - reject if unavailable)
    let rate = get_eth_algo_rate().await?;

    // Calculate output
    // ckETH has 18 decimals, ckALGO has 6 decimals
    // cketh_amount is in wei (1e-18 ETH)
    // rate is ETH/ALGO (how many ALGO per ETH)
    // output should be in microALGO (1e-6 ALGO)
    let cketh_as_f64 = nat_to_f64(&cketh_amount);
    let eth_amount = cketh_as_f64 / 1e18;  // Convert wei to ETH
    let algo_amount = eth_amount * rate;    // ETH to ALGO
    let micro_algo = algo_amount * 1e6;     // ALGO to microALGO

    // Apply fee
    let fee_bps = SWAP_FEE_BPS.with(|f| *f.borrow());
    let fee_amount = micro_algo * (fee_bps as f64 / 10_000.0);
    let net_micro_algo = micro_algo - fee_amount;

    if net_micro_algo <= 0.0 {
        return Err("Output amount too small after fee".to_string());
    }

    // Bounds check before u64 cast (P2 fix: prevent truncation/overflow)
    if net_micro_algo > (u64::MAX as f64) {
        return Err(format!(
            "Output amount {} exceeds maximum representable value",
            net_micro_algo
        ));
    }
    if fee_amount > (u64::MAX as f64) {
        return Err(format!(
            "Fee amount {} exceeds maximum representable value",
            fee_amount
        ));
    }

    let ckalgo_out = Nat::from(net_micro_algo.floor() as u64);
    let fee_nat = Nat::from(fee_amount.floor() as u64);

    // Slippage check
    if let Some(min_out) = min_ckalgo_out {
        if ckalgo_out < min_out {
            return Err(format!(
                "Slippage exceeded: output {} < minimum {}",
                ckalgo_out, min_out
            ));
        }
    }

    // Execute: Pull ckETH from user via ICRC-2 transfer_from
    let cketh_canister = Principal::from_text(CKETH_CANISTER_ID)
        .map_err(|e| format!("Invalid ckETH canister ID: {}", e))?;
    let this_canister = ic_cdk::api::id();

    let transfer_args = TransferFromArgs {
        from: Account {
            owner: user,
            subaccount: None,
        },
        to: Account {
            owner: this_canister,
            subaccount: None,
        },
        amount: cketh_amount.clone(),
        fee: None,
        memo: None,
        created_at_time: None,
        spender_subaccount: None,
    };

    // Inter-canister call to ckETH
    let transfer_result: Result<(Result<Nat, TransferFromError>,), _> =
        ic_cdk::call(cketh_canister, "icrc2_transfer_from", (transfer_args,)).await;

    match transfer_result {
        Ok((Ok(block_index),)) => {
            // ckETH received! Now mint ckALGO
            let user_str = user.to_text();

            // Mint ckALGO to user
            BALANCES.with(|balances| {
                let mut balances_map = balances.borrow_mut();
                let current = balances_map.get(&user_str).unwrap_or(&Nat::from(0u64)).clone();
                balances_map.insert(user_str.clone(), current + ckalgo_out.clone());
            });

            // Update total supply
            TOTAL_SUPPLY.with(|supply| {
                let mut total = supply.borrow_mut();
                *total = total.clone() + ckalgo_out.clone();
            });

            // Track ckETH-backed ckALGO separately (NOT backed by ALGO reserves)
            CKETH_BACKED_CKALGO.with(|backed| {
                let mut total = backed.borrow_mut();
                *total = total.clone() + ckalgo_out.clone();
            });

            // Track total ckETH received
            TOTAL_CKETH_RECEIVED.with(|received| {
                let mut total = received.borrow_mut();
                *total = total.clone() + cketh_amount.clone();
            });

            // Record swap for audit trail
            let record = SwapRecord {
                user,
                cketh_in: cketh_amount.clone(),
                ckalgo_out: ckalgo_out.clone(),
                rate_used: rate,
                fee_collected: fee_nat,
                timestamp: time(),
                tx_id: format!("SWAP_{}", block_index),
            };

            SWAP_RECORDS.with(|records| records.borrow_mut().push(record));

            Ok(SwapResult {
                cketh_in: cketh_amount,
                ckalgo_out,
                rate_used: rate,
                cketh_block_index: block_index,
            })
        }
        Ok((Err(e),)) => Err(format!("ckETH transfer_from failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Inter-canister call to ckETH failed: {:?} - {}", code, msg)),
    }
}

// ============================================================================
// SWAP ADMIN FUNCTIONS
// ============================================================================

/// Enable/disable swaps (controllers only)
#[update]
fn set_swap_enabled(enabled: bool) -> Result<String, String> {
    let caller_principal = caller();
    if !ic_cdk::api::is_controller(&caller_principal) {
        return Err("Only controllers can enable/disable swaps".to_string());
    }

    SWAP_ENABLED.with(|e| *e.borrow_mut() = enabled);
    Ok(format!("Swaps {}", if enabled { "enabled" } else { "disabled" }))
}

/// Set swap fee (controllers only, max 5%)
#[update]
fn set_swap_fee_bps(fee_bps: u64) -> Result<String, String> {
    let caller_principal = caller();
    if !ic_cdk::api::is_controller(&caller_principal) {
        return Err("Only controllers can set swap fee".to_string());
    }

    if fee_bps > 500 {
        return Err("Fee cannot exceed 5% (500 bps)".to_string());
    }

    SWAP_FEE_BPS.with(|f| *f.borrow_mut() = fee_bps);
    Ok(format!("Swap fee set to {} bps ({}%)", fee_bps, fee_bps as f64 / 100.0))
}

/// Set swap limits (controllers only)
#[update]
fn set_swap_limits(min_cketh: Nat, max_cketh: Nat) -> Result<String, String> {
    let caller_principal = caller();
    if !ic_cdk::api::is_controller(&caller_principal) {
        return Err("Only controllers can set swap limits".to_string());
    }

    if min_cketh >= max_cketh {
        return Err("Minimum must be less than maximum".to_string());
    }

    MIN_SWAP_CKETH.with(|m| *m.borrow_mut() = min_cketh.clone());
    MAX_SWAP_CKETH.with(|m| *m.borrow_mut() = max_cketh.clone());

    Ok(format!("Swap limits set: min={}, max={}", min_cketh, max_cketh))
}

/// Query swap configuration
#[query]
fn get_swap_config() -> SwapConfig {
    SwapConfig {
        enabled: SWAP_ENABLED.with(|e| *e.borrow()),
        fee_bps: SWAP_FEE_BPS.with(|f| *f.borrow()),
        min_cketh: MIN_SWAP_CKETH.with(|m| m.borrow().clone()),
        max_cketh: MAX_SWAP_CKETH.with(|m| m.borrow().clone()),
        cketh_backed_ckalgo: CKETH_BACKED_CKALGO.with(|b| b.borrow().clone()),
        total_cketh_received: TOTAL_CKETH_RECEIVED.with(|t| t.borrow().clone()),
    }
}

/// Query swap history (most recent first)
#[query]
fn get_swap_records(limit: Option<u32>) -> Vec<SwapRecord> {
    let limit = limit.unwrap_or(100) as usize;
    SWAP_RECORDS.with(|records| {
        let r = records.borrow();
        r.iter().rev().take(limit).cloned().collect()
    })
}

/// Get current ETH/ALGO rate (exposed for quote calculations)
/// Note: This is async and requires an update call
#[update]
async fn get_current_eth_algo_rate() -> Result<f64, String> {
    get_eth_algo_rate().await
}

// ============================================================================
// DEPOSIT-BASED SWAP FUNCTIONS (Autonomous Agent Flow)
// ============================================================================

/// Derive custody subaccount for a principal (for ckETH deposits)
///
/// Agent should transfer ckETH to:
///   Account { owner: simplified_bridge_canister, subaccount: Some(result) }
///
/// The subaccount is SHA256(principal.as_slice())[0:32]
fn derive_custody_subaccount(principal: &Principal) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(principal.as_slice());
    let result = hasher.finalize();
    let mut subaccount = [0u8; 32];
    subaccount.copy_from_slice(&result[..32]);
    subaccount
}

/// Get custody subaccount for ckETH deposits (query)
///
/// Returns the 32-byte subaccount that the agent should deposit ckETH to.
/// Full deposit account: { owner: this_canister, subaccount: result }
#[query]
fn get_swap_custody_subaccount(principal: Principal) -> Vec<u8> {
    derive_custody_subaccount(&principal).to_vec()
}

/// Check if a swap deposit has already been processed (anti-replay)
#[query]
fn is_swap_deposit_processed(tx_id: String) -> bool {
    PROCESSED_SWAP_DEPOSITS.with(|d| d.borrow().contains(&tx_id))
}

/// Get list of processed swap deposits (for debugging/audit)
#[query]
fn get_processed_swap_deposits(limit: Option<u32>) -> Vec<String> {
    let limit = limit.unwrap_or(100) as usize;
    PROCESSED_SWAP_DEPOSITS.with(|d| {
        d.borrow().iter().take(limit).cloned().collect()
    })
}

/// Swap ckETH for ckALGO - Deposit-Based (Autonomous Agent Flow)
///
/// SECURITY: Only callable by authorized principals (backend, controllers)
/// Backend MUST verify ckETH deposit BEFORE calling this function.
///
/// Flow:
/// 1. Agent transfers ckETH to custody subaccount (standard ICRC-1 transfer)
/// 2. Agent calls backend POST /swap/execute with tx_id
/// 3. Backend verifies ckETH balance in custody subaccount
/// 4. Backend calls this function with deposit details
/// 5. Canister verifies deposit not already processed (anti-replay)
/// 6. Canister gets exchange rate from XRC
/// 7. Canister mints ckALGO to agent's principal
/// 8. Canister marks deposit as processed
///
/// NOTE: This function does NOT call ckETH canister to verify balance.
/// Backend is trusted to verify the deposit before calling.
#[update]
async fn swap_cketh_for_ckalgo_deposit(
    agent_principal: Principal,
    cketh_amount: Nat,
    cketh_tx_id: String,
    min_ckalgo_out: Option<Nat>
) -> Result<SwapResult, String> {
    // 1. Authorization check
    let caller_principal = caller();
    let is_authorized = AUTHORIZED_MINTERS.with(|m| m.borrow().contains(&caller_principal));
    let is_controller = ic_cdk::api::is_controller(&caller_principal);

    if !is_authorized && !is_controller {
        return Err(format!(
            "Unauthorized: only authorized principals can execute deposit swaps. Caller: {}",
            caller_principal
        ));
    }

    // 2. Check swap enabled
    let enabled = SWAP_ENABLED.with(|e| *e.borrow());
    if !enabled {
        return Err("Swaps are currently disabled".to_string());
    }

    // 3. Check for duplicate tx_id (anti-replay protection)
    let is_duplicate = PROCESSED_SWAP_DEPOSITS.with(|deposits| {
        deposits.borrow().contains(&cketh_tx_id)
    });
    if is_duplicate {
        return Err(format!("Deposit {} already processed", cketh_tx_id));
    }

    // 4. Validate amount within limits
    let min_swap = MIN_SWAP_CKETH.with(|m| m.borrow().clone());
    let max_swap = MAX_SWAP_CKETH.with(|m| m.borrow().clone());

    if cketh_amount < min_swap {
        return Err(format!(
            "Swap amount {} below minimum {} (0.0001 ETH)",
            cketh_amount, min_swap
        ));
    }
    if cketh_amount > max_swap {
        return Err(format!(
            "Swap amount {} exceeds maximum {} (1 ETH)",
            cketh_amount, max_swap
        ));
    }

    // 5. Get exchange rate from XRC (NO FALLBACK - reject if unavailable)
    let rate = get_eth_algo_rate().await?;

    // 6. Calculate output
    // ckETH has 18 decimals, ckALGO has 6 decimals
    // cketh_amount is in wei (1e-18 ETH)
    // rate is ETH/ALGO (how many ALGO per ETH)
    // output should be in microALGO (1e-6 ALGO)
    let cketh_as_f64 = nat_to_f64(&cketh_amount);
    let eth_amount = cketh_as_f64 / 1e18;  // Convert wei to ETH
    let algo_amount = eth_amount * rate;    // ETH to ALGO
    let micro_algo = algo_amount * 1e6;     // ALGO to microALGO

    // Apply fee
    let fee_bps = SWAP_FEE_BPS.with(|f| *f.borrow());
    let fee_amount = micro_algo * (fee_bps as f64 / 10_000.0);
    let net_micro_algo = micro_algo - fee_amount;

    if net_micro_algo <= 0.0 {
        return Err("Output amount too small after fee".to_string());
    }

    // Bounds check before u64 cast (P2 fix: prevent truncation/overflow)
    if net_micro_algo > (u64::MAX as f64) {
        return Err(format!(
            "Output amount {} exceeds maximum representable value",
            net_micro_algo
        ));
    }
    if fee_amount > (u64::MAX as f64) {
        return Err(format!(
            "Fee amount {} exceeds maximum representable value",
            fee_amount
        ));
    }

    let ckalgo_out = Nat::from(net_micro_algo.floor() as u64);
    let fee_nat = Nat::from(fee_amount.floor() as u64);

    // 7. Slippage check
    if let Some(min_out) = min_ckalgo_out {
        if ckalgo_out < min_out {
            return Err(format!(
                "Slippage exceeded: output {} < minimum {}",
                ckalgo_out, min_out
            ));
        }
    }

    // 8. Mark deposit as processed BEFORE minting (prevents double-processing on retry)
    PROCESSED_SWAP_DEPOSITS.with(|deposits| {
        deposits.borrow_mut().insert(cketh_tx_id.clone());
    });

    // 9. Mint ckALGO to agent
    let agent_str = agent_principal.to_text();

    BALANCES.with(|balances| {
        let mut balances_map = balances.borrow_mut();
        let current = balances_map.get(&agent_str).unwrap_or(&Nat::from(0u64)).clone();
        balances_map.insert(agent_str.clone(), current + ckalgo_out.clone());
    });

    // 10. Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let mut total = supply.borrow_mut();
        *total = total.clone() + ckalgo_out.clone();
    });

    // 11. Track ckETH-backed ckALGO separately (NOT backed by ALGO reserves)
    CKETH_BACKED_CKALGO.with(|backed| {
        let mut total = backed.borrow_mut();
        *total = total.clone() + ckalgo_out.clone();
    });

    // 12. Track total ckETH received
    TOTAL_CKETH_RECEIVED.with(|received| {
        let mut total = received.borrow_mut();
        *total = total.clone() + cketh_amount.clone();
    });

    // 13. Record swap for audit trail
    let record = SwapRecord {
        user: agent_principal,
        cketh_in: cketh_amount.clone(),
        ckalgo_out: ckalgo_out.clone(),
        rate_used: rate,
        fee_collected: fee_nat,
        timestamp: time(),
        tx_id: format!("DEPOSIT_SWAP_{}", cketh_tx_id),
    };

    SWAP_RECORDS.with(|records| records.borrow_mut().push(record));

    // 14. Return result
    Ok(SwapResult {
        cketh_in: cketh_amount,
        ckalgo_out,
        rate_used: rate,
        cketh_block_index: Nat::from(0u64), // Not applicable for deposit-based swap
    })
}