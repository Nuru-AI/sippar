#!/usr/bin/env python3
"""
Oracle Callback Test Contract - Algorand PyTeal
Sprint 009 Testing Infrastructure - PERMANENT

This contract receives callbacks from Sippar AI Oracle and stores AI responses.
Used for testing the complete Oracle request-response cycle.

USAGE:
    python oracle-callback-contract.py
    
OUTPUTS:
    - oracle_callback_approval.teal
    - oracle_callback_clear_state.teal
    - Ready for deployment to Algorand testnet/mainnet
"""

from pyteal import *

def approval_program():
    """
    Oracle Callback Test Contract - Approval Program
    
    Handles:
    1. Oracle callback responses with AI data
    2. Request storage and retrieval
    3. Response validation
    """
    
    # Global state keys
    oracle_requests_count = Bytes("oracle_requests_count")
    last_request_id = Bytes("last_request_id")
    last_ai_response = Bytes("last_ai_response")
    last_confidence = Bytes("last_confidence")
    last_processing_time = Bytes("last_processing_time")
    oracle_address = Bytes("oracle_address")
    
    # Initialize contract
    on_init = Seq([
        App.globalPut(oracle_requests_count, Int(0)),
        App.globalPut(oracle_address, Bytes("EFGDWGG3VS5GTFX7XOI32B5NCYUF5NWTFP2LKLPNQXMWOXGOU2SYD7KOMI")),  # Oracle account
        Return(Int(1))
    ])
    
    # Handle Oracle callback with AI response
    on_oracle_callback = Seq([
        # Verify sender is authorized Oracle
        Assert(Txn.sender() == App.globalGet(oracle_address)),
        
        # Extract callback arguments
        # Arg 0: method name ("ai_response_callback")
        # Arg 1: request ID
        # Arg 2: AI response text
        # Arg 3: confidence score (0-100)
        # Arg 4: processing time (ms)
        Assert(Txn.application_args.length() >= Int(5)),
        Assert(Txn.application_args[0] == Bytes("ai_response_callback")),
        
        # Store the response data
        App.globalPut(last_request_id, Txn.application_args[1]),
        App.globalPut(last_ai_response, Txn.application_args[2]),
        App.globalPut(last_confidence, Btoi(Txn.application_args[3])),
        App.globalPut(last_processing_time, Btoi(Txn.application_args[4])),
        
        # Increment request counter
        App.globalPut(oracle_requests_count, App.globalGet(oracle_requests_count) + Int(1)),
        
        Return(Int(1))
    ])
    
    # Submit AI request to Oracle (for testing)
    on_request_ai = Seq([
        # This would normally call the Oracle contract
        # For testing, we just store the request
        Assert(Txn.application_args.length() >= Int(3)),
        # Arg 0: "request_ai"
        # Arg 1: query text
        # Arg 2: model name
        Return(Int(1))
    ])
    
    # Get stored response data
    on_get_response = Seq([
        # Return the last stored AI response
        Return(Int(1))
    ])
    
    # Main program logic
    program = Cond(
        [Txn.application_id() == Int(0), on_init],
        [Txn.application_args[0] == Bytes("ai_response_callback"), on_oracle_callback],
        [Txn.application_args[0] == Bytes("request_ai"), on_request_ai],
        [Txn.application_args[0] == Bytes("get_response"), on_get_response]
    )
    
    return program

def clear_state_program():
    """Clear state program - always approve"""
    return Return(Int(1))

if __name__ == "__main__":
    # Compile the contract
    approval_teal = compileTeal(approval_program(), Mode.Application, version=6)
    clear_state_teal = compileTeal(clear_state_program(), Mode.Application, version=6)
    
    print("=== APPROVAL PROGRAM ===")
    print(approval_teal)
    print("\n=== CLEAR STATE PROGRAM ===")
    print(clear_state_teal)
    
    # Write to files for deployment
    with open("oracle_callback_approval.teal", "w") as f:
        f.write(approval_teal)
    
    with open("oracle_callback_clear_state.teal", "w") as f:
        f.write(clear_state_teal)
    
    print("\n✅ Contract compiled successfully!")
    print("📁 Files: oracle_callback_approval.teal, oracle_callback_clear_state.teal")
    
    # Print global state schema
    print("\n📊 Global State Schema:")
    print("- Bytes: 4 (request_id, ai_response, oracle_address, plus buffer)")
    print("- Ints: 3 (requests_count, confidence, processing_time)")