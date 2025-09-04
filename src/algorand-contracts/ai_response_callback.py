#!/usr/bin/env python3
"""
AI Response Callback Contract Template - Algorand Native Oracle Pattern

Template contract for receiving AI analysis results from Sippar backend.
This demonstrates how smart contracts can receive and process AI oracle responses.

Usage Pattern:
1. Smart contract calls Sippar AI Oracle with callback reference
2. Sippar backend processes AI request
3. Backend calls this callback contract with AI results
4. Contract processes AI response and executes business logic

This is a template - actual implementations would add specific business logic.
"""

from pyteal import *


class AIResponseCallback:
    """Template callback contract for receiving AI oracle responses"""
    
    def __init__(self):
        # Global state keys
        self.oracle_address_key = Bytes("oracle_address")
        self.contract_admin_key = Bytes("contract_admin")
        self.last_response_key = Bytes("last_response")
        self.response_count_key = Bytes("response_count")
        
        # Local state keys
        self.user_last_query_key = Bytes("last_query")
        self.user_last_response_key = Bytes("last_response")
        
    def approval_program(self):
        """Main approval program for callback contract"""
        
        # Initialize callback contract
        on_creation = Seq([
            App.globalPut(self.contract_admin_key, Txn.sender()),
            App.globalPut(self.response_count_key, Int(0)),
            Approve()
        ])
        
        # Admin check
        is_admin = Txn.sender() == App.globalGet(self.contract_admin_key)
        
        # Set oracle address (admin only)
        set_oracle_address = Seq([
            Assert(is_admin),
            App.globalPut(self.oracle_address_key, Txn.application_args[1]),
            Approve()
        ])
        
        # Receive AI response from Sippar backend
        # Expected args: ["receive_ai_response", request_id, ai_response, confidence_score, processing_time_ms]
        receive_ai_response = Seq([
            # TODO: Add sender verification - only Sippar backend should call this
            # For now, accept any sender for demo purposes
            
            # Store response data
            App.globalPut(self.last_response_key, Txn.application_args[2]),  # ai_response
            App.globalPut(self.response_count_key, 
                         App.globalGet(self.response_count_key) + Int(1)),
            
            # Store user-specific response
            App.localPut(Txn.sender(), self.user_last_response_key, Txn.application_args[2]),
            
            # TODO: Add business logic here based on AI response
            # Examples:
            # - Risk assessment: parse confidence score and update lending parameters
            # - Price prediction: update pricing models based on AI analysis
            # - Security audit: flag contracts based on vulnerability detection
            
            # For demo: just log that response was received
            Log(Concat(
                Bytes("AI_RESPONSE_RECEIVED|"),
                Txn.application_args[1],  # request_id
                Bytes("|"),
                Txn.application_args[3],  # confidence_score
                Bytes("|"),
                Txn.application_args[4]   # processing_time_ms
            )),
            
            Approve()
        ])
        
        # Get last AI response (read-only)
        get_last_response = Seq([
            App.globalPut(Bytes("temp_response"), App.globalGet(self.last_response_key)),
            Approve()
        ])
        
        # Get response count
        get_response_count = Seq([
            App.globalPut(Bytes("temp_count"), Itob(App.globalGet(self.response_count_key))),
            Approve()
        ])
        
        # Example business logic functions (to be customized)
        
        # Process risk assessment response
        process_risk_assessment = Seq([
            # Parse AI response for risk score
            # This is a simplified example - real implementation would parse JSON
            
            # Log risk assessment received
            Log(Concat(
                Bytes("RISK_ASSESSMENT|"),
                Txn.application_args[1],  # AI response
                Bytes("|CONFIDENCE:"),
                Txn.application_args[2]   # confidence score
            )),
            
            # TODO: Add actual risk processing logic
            # - Update lending parameters
            # - Approve/deny loan applications
            # - Adjust interest rates
            
            Approve()
        ])
        
        # Process price prediction response  
        process_price_prediction = Seq([
            # Log price prediction received
            Log(Concat(
                Bytes("PRICE_PREDICTION|"),
                Txn.application_args[1],  # AI response
                Bytes("|CONFIDENCE:"),
                Txn.application_args[2]   # confidence score
            )),
            
            # TODO: Add actual price processing logic
            # - Update NFT pricing models
            # - Adjust market maker parameters
            # - Update yield farming strategies
            
            Approve()
        ])
        
        # Process security audit response
        process_security_audit = Seq([
            # Log security audit received
            Log(Concat(
                Bytes("SECURITY_AUDIT|"),
                Txn.application_args[1],  # AI response
                Bytes("|CONFIDENCE:"),
                Txn.application_args[2]   # confidence score
            )),
            
            # TODO: Add actual security processing logic
            # - Flag vulnerable contracts
            # - Update security scores
            # - Trigger manual review processes
            
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
                Txn.application_args[0] == Bytes("set_oracle_address")
            ), set_oracle_address],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("receive_ai_response"),
                Txn.application_args.length() == Int(5)
            ), receive_ai_response],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("get_last_response")
            ), get_last_response],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("get_response_count")
            ), get_response_count],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("process_risk_assessment")
            ), process_risk_assessment],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("process_price_prediction")
            ), process_price_prediction],
            [And(
                Txn.on_completion() == OnComplete.NoOp,
                Txn.application_args[0] == Bytes("process_security_audit")
            ), process_security_audit]
        )
        
        return program
    
    def clear_state_program(self):
        """Clear state program"""
        return Approve()


def compile_ai_response_callback():
    """Compile the AI Response Callback contract to TEAL"""
    callback = AIResponseCallback()
    
    approval_program = callback.approval_program()
    clear_program = callback.clear_state_program()
    
    return approval_program, clear_program


if __name__ == "__main__":
    # Compile and output TEAL code
    approval_teal, clear_teal = compile_ai_response_callback()
    
    print("=== AI Response Callback Approval Program ===")
    print(compileTeal(approval_teal, mode=Mode.Application, version=6))
    print("\n=== AI Response Callback Clear State Program ===")
    print(compileTeal(clear_teal, mode=Mode.Application, version=6))