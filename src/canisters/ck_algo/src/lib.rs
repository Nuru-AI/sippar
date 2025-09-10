// ckALGO - Minimal Chain-Key Algorand Token on Internet Computer
// Simplified version for initial deployment

use ic_cdk::{init, query, update, caller, api::time};
use candid::{Principal, Nat};
use std::collections::HashMap;
use std::cell::RefCell;

// Global state - simplified for deployment
thread_local! {
    static BALANCES: RefCell<HashMap<String, Nat>> = RefCell::new(HashMap::new());
    static TOTAL_SUPPLY: RefCell<Nat> = RefCell::new(Nat::from(0u64));
    static TOKEN_NAME: RefCell<String> = RefCell::new("Chain-Key ALGO".to_string());
    static TOKEN_SYMBOL: RefCell<String> = RefCell::new("ckALGO".to_string());
    static DECIMALS: RefCell<u8> = RefCell::new(6u8);
    static FEE: RefCell<Nat> = RefCell::new(Nat::from(10000u64));
    static AUTHORIZED_MINTERS: RefCell<Vec<Principal>> = RefCell::new(Vec::new());
}

// Helper functions
fn principal_to_string(principal: &Principal) -> String {
    principal.to_text()
}

fn get_balance_internal(account: &str) -> Nat {
    BALANCES.with(|balances| {
        balances.borrow().get(account).cloned().unwrap_or_else(|| Nat::from(0u64))
    })
}

fn set_balance_internal(account: &str, amount: Nat) {
    BALANCES.with(|balances| {
        balances.borrow_mut().insert(account.to_string(), amount);
    });
}

// Canister initialization
#[init]
fn init() {
    // Initialize with basic configuration
    TOKEN_NAME.with(|name| *name.borrow_mut() = "Chain-Key ALGO".to_string());
    TOKEN_SYMBOL.with(|symbol| *symbol.borrow_mut() = "ckALGO".to_string());
    DECIMALS.with(|decimals| *decimals.borrow_mut() = 6u8);
    FEE.with(|fee| *fee.borrow_mut() = Nat::from(10000u64));
    
    // Initialize authorized minters
    AUTHORIZED_MINTERS.with(|minters| {
        let mut minters_vec = minters.borrow_mut();
        // Management canister (for administrative operations)
        minters_vec.push(Principal::management_canister());
        // Threshold signer canister - Phase 3 integration
        minters_vec.push(Principal::from_text("vj7ly-diaaa-aaaae-abvoq-cai").unwrap());
        // Add backend canister ID when available
        // minters_vec.push(Principal::from_text("backend-canister-id").unwrap());
    });
}

// ICRC-1 Standard Methods (simplified)
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
    let account_str = principal_to_string(&account);
    get_balance_internal(&account_str)
}

#[query]
fn icrc1_supported_standards() -> Vec<(String, String)> {
    vec![
        ("ICRC-1".to_string(), "https://github.com/dfinity/ICRC-1".to_string()),
    ]
}

// Simplified transfer function
#[update]
fn icrc1_transfer(to: Principal, amount: Nat) -> Result<Nat, String> {
    let caller = caller();
    let caller_str = principal_to_string(&caller);
    let to_str = principal_to_string(&to);
    
    // Check balance
    let caller_balance = get_balance_internal(&caller_str);
    let fee = FEE.with(|f| f.borrow().clone());
    let total_needed = amount.clone() + fee;
    
    if caller_balance < total_needed {
        return Err("Insufficient funds".to_string());
    }
    
    // Perform transfer
    let new_caller_balance = caller_balance - total_needed;
    let recipient_balance = get_balance_internal(&to_str);
    let new_recipient_balance = recipient_balance + amount;
    
    set_balance_internal(&caller_str, new_caller_balance);
    set_balance_internal(&to_str, new_recipient_balance);
    
    Ok(Nat::from(time() as u64)) // Return transaction index (simplified)
}

// ckALGO Specific Methods (simplified)
#[update]
fn mint_ck_algo(to: Principal, amount: Nat) -> Result<Nat, String> {
    // Check if caller is authorized to mint
    let caller = caller();
    let is_authorized = AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&caller)
    });
    
    if !is_authorized {
        return Err(format!("Unauthorized minting attempt from principal: {}", caller.to_text()));
    }
    
    let to_str = principal_to_string(&to);
    let current_balance = get_balance_internal(&to_str);
    let new_balance = current_balance + amount.clone();
    
    set_balance_internal(&to_str, new_balance);
    
    // Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let current_supply = supply.borrow().clone();
        *supply.borrow_mut() = current_supply + amount;
    });
    
    Ok(Nat::from(time() as u64))
}

#[update]
fn redeem_ck_algo(amount: Nat, algorand_address: String) -> Result<String, String> {
    let caller = caller();
    let caller_str = principal_to_string(&caller);
    
    // Check balance
    let caller_balance = get_balance_internal(&caller_str);
    if caller_balance < amount {
        return Err("Insufficient funds".to_string());
    }
    
    // Burn tokens
    let new_balance = caller_balance - amount.clone();
    set_balance_internal(&caller_str, new_balance);
    
    // Update total supply
    TOTAL_SUPPLY.with(|supply| {
        let current_supply = supply.borrow().clone();
        *supply.borrow_mut() = current_supply - amount;
    });
    
    // Return mock Algorand transaction ID
    Ok(format!("ALGO_TX_{}", time()))
}

// Utility Methods
#[query]
fn get_algorand_custody_address() -> String {
    "CUSTODY_ADDRESS_NOT_SET".to_string()
}

#[query]
fn get_reserves() -> (Nat, Nat, f32) {
    let total_supply = TOTAL_SUPPLY.with(|supply| supply.borrow().clone());
    let algorand_balance = Nat::from(0u64); // Placeholder
    (total_supply, algorand_balance, 1.0)
}

// Admin Methods
#[update]
fn update_algorand_balance(balance: Nat) -> Result<(), String> {
    // Placeholder for updating Algorand balance
    Ok(())
}

// Authorized Minter Management
#[update]
fn add_authorized_minter(principal: Principal) -> Result<(), String> {
    let caller = caller();
    // Allow canister controller to add minters
    let controller = Principal::from_text("27ssj-4t63z-3sydd-lcaf3-d6uix-zurll-zovsc-nmtga-hkrls-yrawj-mqe").unwrap();
    if caller != controller && caller != Principal::management_canister() {
        return Err("Only canister controller or management canister can add authorized minters".to_string());
    }
    
    AUTHORIZED_MINTERS.with(|minters| {
        let mut minters_vec = minters.borrow_mut();
        if !minters_vec.contains(&principal) {
            minters_vec.push(principal);
        }
    });
    
    Ok(())
}

#[update]
fn remove_authorized_minter(principal: Principal) -> Result<(), String> {
    let caller = caller();
    if caller != Principal::management_canister() {
        return Err("Only management canister can remove authorized minters".to_string());
    }
    
    AUTHORIZED_MINTERS.with(|minters| {
        let mut minters_vec = minters.borrow_mut();
        minters_vec.retain(|p| p != &principal);
    });
    
    Ok(())
}

#[query]
fn get_authorized_minters() -> Vec<Principal> {
    AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().clone()
    })
}

#[query]
fn is_authorized_minter(principal: Principal) -> bool {
    AUTHORIZED_MINTERS.with(|minters| {
        minters.borrow().contains(&principal)
    })
}

#[query]
fn get_caller() -> Principal {
    caller()
}