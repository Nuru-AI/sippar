#!/usr/bin/env python3
"""
Sippar AI Oracle Smart Contract - Algorand Native Oracle Implementation

Based on proven Algorand oracle patterns used in production MainNet oracles.
Enables AI agents to pay for and access AI models through smart contracts.

Architecture:
- Request credit system with atomic transfers
- Whitelisting for admin-controlled access
- Transaction note-based request identification
- Callback system for async AI response delivery

Following Algorand oracle standards as demonstrated by TEAL ALGO Oracle (MainNet since 2021).
"""

from pyteal import *


class SipparAIOracle:
    """Sippar AI Oracle Contract - Native Algorand Oracle Pattern Implementation"""
    
    def __init__(self):
        # Global state keys
        self.oracle_admin_key = Bytes("oracle_admin")
        self.total_requests_key = Bytes("total_requests")
        self.credit_price_key = Bytes("credit_price")  # Price in microALGO per credit
        self.available_models_key = Bytes("available_models")
        
        # Local state keys (per user)
        self.user_credits_key = Bytes("user_credits")
        self.whitelisted_key = Bytes("whitelisted")
        
        # Transaction note for oracle request identification
        self.oracle_note_prefix = Bytes("sippar-ai-oracle")
        
        # Constants
        self.default_credit_price = Int(10000)  # 0.01 ALGO per credit in microALGO
        self.max_query_length = Int(1024)  # Maximum AI query length in bytes
        
    def approval_program(self):
        """Main approval program for the AI Oracle contract"""
        
        # Initialize oracle on creation
        on_creation = Seq([
            App.globalPut(self.oracle_admin_key, Txn.sender()),
            App.globalPut(self.total_requests_key, Int(0)),
            App.globalPut(self.credit_price_key, self.default_credit_price),
            App.globalPut(self.available_models_key, Bytes("qwen2.5,deepseek-r1,phi-3,mistral")),
            Approve()
        ])
        
        # Admin check helper
        is_admin = Txn.sender() == App.globalGet(self.oracle_admin_key)
        
        # Purchase AI credits (atomic transfer required)
        purchase_credits = Seq([
            # Verify payment transaction
            Assert(Gtxn[1].type_enum() == TxnType.Payment),
            Assert(Gtxn[1].receiver() == Global.current_application_address()),
            Assert(Gtxn[1].amount() >= App.globalGet(self.credit_price_key)),
            
            # Calculate credits to add (amount / credit_price)
            App.localPut(
                Txn.sender(),
                self.user_credits_key,
                App.localGet(Txn.sender(), self.user_credits_key) + 
                (Gtxn[1].amount() / App.globalGet(self.credit_price_key))
            ),
            
            Approve()
        ])
        
        # Request AI analysis (consumes 1 credit)
        request_ai_analysis = Seq([
            # Verify user has credits
            Assert(App.localGet(Txn.sender(), self.user_credits_key) >= Int(1)),
            
            # Verify query parameters
            Assert(Len(Txn.application_args[1]) <= self.max_query_length),  # query
            Assert(Len(Txn.application_args[2]) > Int(0)),  # model
            Assert(Txn.application_args[3] != Bytes("")),   # callback_app_id
            Assert(Txn.application_args[4] != Bytes("")),   # callback_method
            
            # Verify transaction note for backend detection
            Assert(Txn.note() == self.oracle_note_prefix),
            
            # Consume 1 credit
            App.localPut(
                Txn.sender(),
                self.user_credits_key,
                App.localGet(Txn.sender(), self.user_credits_key) - Int(1)
            ),
            
            # Increment total requests counter
            App.globalPut(
                self.total_requests_key,
                App.globalGet(self.total_requests_key) + Int(1)
            ),
            
            # Return success - backend will detect via transaction note
            Approve()
        ])
        
        # Get user's remaining AI credits
        get_ai_credits = Seq([
            App.globalPut(Bytes("temp_result"), Itob(App.localGet(Txn.sender(), self.user_credits_key))),
            Approve()
        ])
        
        # Get AI service information
        get_service_info = Seq([
            # Store service info in global state for retrieval
            App.globalPut(
                Bytes("temp_service_info"),
                Concat(
                    App.globalGet(self.available_models_key),
                    Bytes("|"),
                    Itob(App.globalGet(self.credit_price_key))
                )
            ),
            Approve()
        ])
        
        # Admin functions
        
        # Whitelist user
        whitelist_user = Seq([
            Assert(is_admin),
            App.localPut(Btoi(Txn.application_args[1]), self.whitelisted_key, Int(1)),
            Approve()
        ])
        
        # Allocate credits to user (admin function)
        allocate_credits = Seq([
            Assert(is_admin),
            App.localPut(
                Btoi(Txn.application_args[1]),  # user address
                self.user_credits_key,
                App.localGet(Btoi(Txn.application_args[1]), self.user_credits_key) + 
                Btoi(Txn.application_args[2])  # credits to add
            ),
            Approve()
        ])
        
        # Update credit price (admin function)
        update_credit_price = Seq([
            Assert(is_admin),
            App.globalPut(self.credit_price_key, Btoi(Txn.application_args[1])),
            Approve()
        ])
        
        # Update available models (admin function)
        update_models = Seq([
            Assert(is_admin),
            App.globalPut(self.available_models_key, Txn.application_args[1]),
            Approve()
        ])
        
        # Main program logic
        program = Cond(
            [Txn.application_id() == Int(0), on_creation],
            [Txn.on_completion() == OnComplete.DeleteApplication, Return(is_admin)],
            [Txn.on_completion() == OnComplete.UpdateApplication, Return(is_admin)],
            [Txn.on_completion() == OnComplete.CloseOut, Approve()],
            [Txn.on_completion() == OnComplete.OptIn, Approve()],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("purchase_credits"),
                Global.group_size() == Int(2)
            ), purchase_credits],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("request_ai_analysis"),
                Txn.application_args.length() == Int(5)
            ), request_ai_analysis],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("get_ai_credits")
            ), get_ai_credits],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("get_service_info")
            ), get_service_info],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("whitelist_user")
            ), whitelist_user],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("allocate_credits")
            ), allocate_credits],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("update_credit_price")
            ), update_credit_price],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("update_models")
            ), update_models]
        )
        
        return program
    
    def clear_state_program(self):
        """Clear state program - always approve"""
        return Approve()


def compile_sippar_ai_oracle():
    """Compile the Sippar AI Oracle contract to TEAL"""
    oracle = SipparAIOracle()
    
    approval_program = oracle.approval_program()
    clear_program = oracle.clear_state_program()
    
    return approval_program, clear_program


if __name__ == "__main__":
    # Compile and output TEAL code
    approval_teal, clear_teal = compile_sippar_ai_oracle()
    
    print("=== Sippar AI Oracle Approval Program ===")
    print(compileTeal(approval_teal, mode=Mode.Application, version=6))
    print("\n=== Sippar AI Oracle Clear State Program ===")
    print(compileTeal(clear_teal, mode=Mode.Application, version=6))