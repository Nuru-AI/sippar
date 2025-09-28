# X402 SDK Examples

This directory contains comprehensive examples demonstrating various uses of the X402 SDK for autonomous AI-to-AI payments.

## 📋 Available Examples

### 1. Basic Payment (`basic-payment.js`)

**Purpose**: Simplest possible X402 integration
**Language**: JavaScript (CommonJS)
**Complexity**: Beginner

Demonstrates:
- Creating an X402 payment
- Using payment token to access AI services
- Basic error handling
- Payment status checking

```bash
node examples/basic-payment.js
```

### 2. Enterprise Integration (`enterprise-integration.ts`)

**Purpose**: Production-ready enterprise usage
**Language**: TypeScript
**Complexity**: Advanced

Demonstrates:
- Bulk AI query processing
- Enterprise billing and analytics
- Comprehensive error handling
- Service discovery and marketplace
- Multi-environment configuration

```bash
npx ts-node examples/enterprise-integration.ts
```

## 🚀 Running Examples

### Prerequisites

1. **Install the SDK**:
   ```bash
   npm install @sippar/x402-sdk
   ```

2. **Set up credentials**:
   - Get your Internet Identity principal
   - Obtain your Algorand address (derived from threshold signatures)
   - For enterprise examples, get your API key

3. **Configure environment** (optional):
   ```bash
   export X402_API_KEY=your-enterprise-api-key
   export ICP_PRINCIPAL=your-internet-identity-principal
   export ALGORAND_ADDRESS=your-algorand-address
   export ENVIRONMENT=production  # or staging/development
   ```

### Basic Example

```bash
# Update credentials in basic-payment.js
node examples/basic-payment.js
```

Expected output:
```
🚀 Starting basic X402 payment example...

💳 Creating X402 payment...
✅ Payment created successfully!
   Payment ID: payment_1234567890
   Expires: 2025-09-20T10:30:00Z
   Algorand backing: 6W47GCLXWEIEZ2LRQCXF7HGLOYSXYCXOPXJ5YE55EULFHB7O4RWIM3JDCI

🤖 Calling AI service with payment token...
✅ AI service responded successfully!
   Response: Blockchain technology is a distributed ledger...
   Model used: phi-3

📊 Checking payment status...
   Status: completed
   Updated: 2025-09-19T10:15:30Z

🎉 Basic payment example completed!
```

### Enterprise Example

```bash
# Set environment variables or update credentials in code
npx ts-node examples/enterprise-integration.ts
```

Expected output:
```
🏢 Enterprise X402 service initialized for production
🚀 Starting Enterprise X402 Integration Example

🛒 Discovering available services...
🏪 Marketplace (5 services available):
   Algorand Integration: Active

   📦 AI Oracle Enhanced (ai-oracle-enhanced)
      Price: $0.05
      Description: Advanced AI processing with reasoning capabilities
      ...

📊 Processing 3 AI queries...
   Processing query 1/3: "Analyze the current state of blockchain technology..."
   ✅ Query 1 completed
   ...
💰 Total cost: $0.15

📈 Retrieving enterprise analytics...
📊 Usage Metrics:
   Total Payments: 1,247
   Total Revenue: $234.56
   ...

🎉 Enterprise integration example completed successfully!
```

## 🎯 Example Use Cases

### Individual Developers

Use `basic-payment.js` to:
- Prototype X402 integration
- Test AI service access
- Understand payment flow
- Learn error handling basics

### Enterprise Applications

Use `enterprise-integration.ts` to:
- Process bulk AI queries
- Monitor usage and costs
- Implement comprehensive error handling
- Integrate with existing systems
- Generate enterprise reports

## 🔧 Customization

### Adding Your Own Examples

1. **Create new file** in `examples/` directory
2. **Import the SDK**:
   ```typescript
   import { X402Client } from '@sippar/x402-sdk';
   ```

3. **Follow the pattern**:
   ```typescript
   async function myExample() {
     const client = new X402Client({
       principal: 'your-principal',
       algorandAddress: 'your-address'
     });

     // Your code here
   }
   ```

4. **Add documentation** to this README

### Configuration Options

Examples support various configuration methods:

**Environment Variables**:
```bash
export X402_API_KEY=your-api-key
export ICP_PRINCIPAL=your-principal
export ALGORAND_ADDRESS=your-address
export X402_BASE_URL=https://custom-api.example.com
export X402_TIMEOUT=60000
```

**Direct Configuration**:
```typescript
const client = new X402Client({
  principal: 'your-principal',
  algorandAddress: 'your-address',
  baseURL: 'https://custom-api.example.com',
  timeout: 60000,
  apiKey: 'your-api-key'
});
```

## 📚 Learning Path

### Beginner
1. Start with `basic-payment.js`
2. Understand payment creation and service access
3. Learn basic error handling

### Intermediate
1. Modify basic example for your use case
2. Explore different AI models and services
3. Implement proper error handling for production

### Advanced
1. Study `enterprise-integration.ts`
2. Implement bulk processing patterns
3. Add analytics and monitoring
4. Build enterprise-grade applications

## 🔍 Troubleshooting

### Common Issues

**Authentication Errors**:
- Verify your Internet Identity principal
- Ensure Algorand address is correctly derived
- Check network connectivity

**Payment Failures**:
- Verify sufficient account balance
- Check service availability
- Ensure valid payment amounts ($0.01 - $100.00)

**Service Access Errors**:
- Verify service token validity (24-hour expiration)
- Check service availability in marketplace
- Ensure correct service endpoint usage

### Debug Mode

Enable debug logging:
```typescript
const client = new X402Client({
  principal: 'your-principal',
  algorandAddress: 'your-address',
  // Add debug configuration if needed
});
```

### Getting Help

- **Documentation**: [README.md](../README.md)
- **Quickstart**: [QUICKSTART.md](../QUICKSTART.md)
- **Issues**: [GitHub Issues](https://github.com/Nuru-AI/sippar/issues)
- **Community**: [GitHub Discussions](https://github.com/Nuru-AI/sippar/discussions)

## 📄 License

All examples are provided under the MIT License and are free to use and modify for your projects.