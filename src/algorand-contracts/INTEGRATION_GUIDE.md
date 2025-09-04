# Sippar AI Oracle - Developer Integration Guide

**Live Oracle**: App ID `745336634` on Algorand Testnet  
**Status**: ✅ **Production Ready**  
**Updated**: September 4, 2025  

## 🚀 **Quick Start**

### **1. Test the Live Oracle** (2 minutes)
```bash
# Install dependencies
pip3 install pyteal py-algorand-sdk requests

# Test with your testnet account
python3 test_oracle.py \
  --network testnet \
  --oracle-app-id 745336634 \
  --test-mnemonic "your 25-word mnemonic here" \
  --credit-amount 0.05
```

### **2. Connect to Live Oracle**
```python
from algosdk import mnemonic, transaction, account, encoding
from algosdk.v2client import algod

# Live testnet oracle constants
ORACLE_APP_ID = 745336634
API_SERVER = "https://testnet-api.4160.nodely.dev"
CONTRACT_ADDRESS = "V7JNM2OLXXXY5LUQJBZFLTGQRBJN7SHLWRGVJ2ZBEWMJUPIFI5CG5C4RZE"

# Initialize client
algod_client = algod.AlgodClient('', API_SERVER)
```

## 📋 **Integration Steps**

### **Step 1: Opt Into Oracle Contract**

```python
def opt_into_oracle(algod_client, private_key, oracle_app_id):
    sender = account.address_from_private_key(private_key)
    params = algod_client.suggested_params()
    
    opt_in_txn = transaction.ApplicationCallTxn(
        sender=sender,
        sp=params,
        index=oracle_app_id,
        on_complete=transaction.OnComplete.OptInOC
    )
    
    signed_txn = opt_in_txn.sign(private_key)
    tx_id = algod_client.send_transaction(signed_txn)
    
    # Wait for confirmation
    transaction.wait_for_confirmation(algod_client, tx_id, 4)
    return tx_id

# Usage
private_key = mnemonic.to_private_key("your mnemonic")
opt_into_oracle(algod_client, private_key, ORACLE_APP_ID)
```

### **Step 2: Purchase AI Credits**

```python
def purchase_credits(algod_client, private_key, oracle_app_id, algo_amount):
    sender = account.address_from_private_key(private_key)
    params = algod_client.suggested_params()
    
    # Calculate oracle contract address
    contract_address = encoding.encode_address(
        encoding.checksum(b"appID" + oracle_app_id.to_bytes(8, 'big'))
    )
    
    # Create payment transaction
    amount_microalgo = int(algo_amount * 1_000_000)
    payment_txn = transaction.PaymentTxn(
        sender=sender,
        sp=params,
        receiver=contract_address,
        amt=amount_microalgo
    )
    
    # Create application call transaction
    app_call_txn = transaction.ApplicationCallTxn(
        sender=sender,
        sp=params,
        index=oracle_app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=["purchase_credits"]
    )
    
    # Create atomic transfer (app call first, then payment)
    group_id = transaction.calculate_group_id([app_call_txn, payment_txn])
    app_call_txn.group = group_id
    payment_txn.group = group_id
    
    # Sign and send
    signed_app = app_call_txn.sign(private_key)
    signed_pay = payment_txn.sign(private_key)
    tx_id = algod_client.send_transactions([signed_app, signed_pay])
    
    transaction.wait_for_confirmation(algod_client, tx_id, 4)
    return tx_id

# Usage - Purchase 5 credits (0.05 ALGO)
purchase_credits(algod_client, private_key, ORACLE_APP_ID, 0.05)
```

### **Step 3: Submit AI Analysis Request**

```python
def request_ai_analysis(algod_client, private_key, oracle_app_id, 
                       query, model, callback_app_id, callback_method):
    sender = account.address_from_private_key(private_key)
    params = algod_client.suggested_params()
    
    app_call_txn = transaction.ApplicationCallTxn(
        sender=sender,
        sp=params,
        index=oracle_app_id,
        on_complete=transaction.OnComplete.NoOpOC,
        app_args=[
            "request_ai_analysis",
            query.encode('utf-8'),
            model.encode('utf-8'),
            str(callback_app_id).encode('utf-8'),
            callback_method.encode('utf-8')
        ],
        note="sippar-ai-oracle".encode('utf-8')  # Required for backend detection
    )
    
    signed_txn = app_call_txn.sign(private_key)
    tx_id = algod_client.send_transaction(signed_txn)
    
    transaction.wait_for_confirmation(algod_client, tx_id, 4)
    return tx_id

# Usage
tx_id = request_ai_analysis(
    algod_client, 
    private_key, 
    ORACLE_APP_ID,
    query="Analyze the market sentiment for ALGO token",
    model="qwen2.5",
    callback_app_id=123456789,  # Your callback contract
    callback_method="receive_ai_response"
)
print(f"AI request submitted: {tx_id}")
```

## 💡 **Use Case Examples**

### **1. DeFi Risk Analysis**
```python
# Smart contract requests risk assessment
def analyze_lending_risk(loan_amount, collateral_ratio, borrower_history):
    query = f"""
    Analyze lending risk for:
    - Loan Amount: {loan_amount} ALGO
    - Collateral Ratio: {collateral_ratio}%
    - Borrower History: {borrower_history}
    
    Provide risk score (1-10) and recommendation.
    """
    
    return request_ai_analysis(
        algod_client, private_key, ORACLE_APP_ID,
        query=query,
        model="deepseek-r1",  # Best for financial analysis
        callback_app_id=lending_contract_id,
        callback_method="process_risk_assessment"
    )
```

### **2. NFT Market Analysis**
```python
# Price prediction for NFT collections
def predict_nft_price(collection_name, recent_sales):
    query = f"""
    Predict fair market value for {collection_name} NFT:
    Recent Sales: {recent_sales}
    Market Trends: Last 30 days
    
    Provide price range and confidence level.
    """
    
    return request_ai_analysis(
        algod_client, private_key, ORACLE_APP_ID,
        query=query,
        model="qwen2.5",  # Best for market analysis
        callback_app_id=marketplace_contract_id,
        callback_method="update_pricing_model"
    )
```

## 🔍 **Available AI Models**

### **qwen2.5** - General Purpose
- **Best For**: Market analysis, sentiment analysis, general reasoning
- **Use Cases**: Price prediction, trend analysis, general Q&A

### **deepseek-r1** - Code & Math
- **Best For**: Financial calculations, code analysis, complex reasoning  
- **Use Cases**: Risk assessment, trading algorithms, financial modeling

### **phi-3** - Lightweight & Fast
- **Best For**: Security analysis, quick decisions, code review
- **Use Cases**: Smart contract audits, anomaly detection

### **mistral** - Multilingual
- **Best For**: International markets, multi-language content
- **Use Cases**: Global trading, international compliance

## 💰 **Pricing & Performance**

### **Current Rates**
- **Credit Price**: 0.01 ALGO per AI query
- **Transaction Fees**: ~0.001-0.002 ALGO per operation
- **Total Cost**: ~0.012 ALGO per AI query

### **Performance Specs**
- **Oracle Processing**: <2 seconds
- **AI Analysis**: 120ms average
- **Total End-to-End**: <5 seconds

## 📞 **Support & Resources**

### **Live Oracle Information**
- **App ID**: `745336634`
- **Explorer**: [View on Testnet Explorer](https://testnet.explorer.perawallet.app/application/745336634)
- **API Server**: `https://testnet-api.4160.nodely.dev`

### **Example Transactions**
- **Credit Purchase**: `ZY26ALTNRA3S7CINGW2QYLGIKO4CJ3ZXOMTY7TPUNI6DGEHVC7RA`
- **AI Request**: `BWTI64NV4ZP5ZTMIA6Y7Y6YJ2OQDC7XWDW5KAIDUM4TKZC4L3U6A`

---

**Integration Guide Status**: ✅ **Complete** - Ready for production development with live testnet oracle