# OpenMesh/XNode Infrastructure Integration

**Last Updated**: September 5, 2025  
**Integration Status**: ✅ Production Active  
**Infrastructure**: XNode2 container services

---

## 🌐 **XNode Infrastructure Overview**

### **Current XNode Status** (Verified September 5, 2025)
- **XNode1**: `xnode1.openmesh.cloud` - Currently empty (no active containers)
- **XNode2**: `xnode2.openmesh.cloud` - 12 active containers including AI services
- **Access Method**: SSH with established credentials
- **Container System**: nixos-container architecture with isolated services

### **XNode2 Active Containers**
```bash
ssh eladm@xnode2.openmesh.cloud "nixos-container list"
```

**Current Active Services**:
- `ai-chat` - Primary AI processing service
- `ai-chat2` - Secondary AI processing service  
- `chainfusion` - Chain fusion backend operations
- `rabbi-bot` - Trading bot services
- `ccip` - Cross-chain bridge operations
- `crypto` - Cryptocurrency intelligence services
- `phase6` - Calendar database integration
- `rabbi-trade` - Trading operations
- `scalable` - Scalability testing
- `trading-db` - Trading database
- `vaultwarden` - Password management
- `wsphase4b` - WebSocket services

---

## 🤖 **AI Services Integration**

### **OpenWebUI Deployment**
Sippar leverages XNode2's containerized AI infrastructure for processing:

**Primary AI Container**: `ai-chat`
- **Service**: OpenWebUI on port 8080
- **Process**: `/bin/python3.13 open-webui serve --host 0.0.0.0 --port 8080`
- **Interface**: Full HTML UI accessible
- **Function**: Privacy-focused AI chat with model management

**Secondary AI Container**: `ai-chat2`
- **Purpose**: Load balancing and redundancy
- **Configuration**: Additional AI processing capacity
- **Integration**: Backup AI service endpoint

### **AI Model Architecture**
Based on verified TokenHunter documentation and system integration:

**Available Models**:
- **DeepSeek-R1**: Primary reasoning model
- **Qwen2.5**: Secondary language model
- **phi-3**: Lightweight model option
- **mistral**: Additional model choice

**Performance Characteristics**:
- **Response Time**: 31-91ms average (from verified health endpoint)
- **Processing**: Local inference on XNode2 hardware
- **Privacy**: On-premises processing, no external API calls

---

## 🔗 **Chain Fusion Backend**

### **Chain Fusion Container**: `chainfusion`
- **Port**: 8001 (container internal)
- **Status**: ✅ Running (processing intensive operations)
- **Function**: Real blockchain trading integration
- **Capability**: Cross-chain operations and transaction processing

### **CCIP Bridge Integration**
- **Container**: `ccip`
- **Function**: Cross-chain interoperability protocol
- **Version**: 3.0.0 with real trading capabilities
- **Supported Networks**: Bitcoin, Ethereum, Polygon, Arbitrum, Avalanche

### **Scalability Services**
- **Container**: `scalable`
- **Port**: 3082 (container internal)
- **Process**: `sprint169-chain-fusion-scalability-fixed.py`
- **Function**: Performance optimization and scalability testing

---

## 🛠️ **Container Management**

### **SSH Access and Administration**
```bash
# Primary access method
ssh eladm@xnode2.openmesh.cloud

# Container listing
nixos-container list

# Container status checking
nixos-container status <container-name>

# Container management (requires admin privileges)
sudo nixos-container restart <container-name>
```

### **Service Architecture**
- **Isolation**: Each service runs in dedicated nixos container
- **Networking**: Bridge networking between containers
- **Security**: Container-level isolation with controlled access
- **Monitoring**: Individual container health monitoring

### **Port Configuration**
Key services run on standard internal ports:
- **AI Services**: Port 8080 (ai-chat, ai-chat2)
- **Chain Fusion**: Port 8001 (chainfusion backend)
- **Scalability**: Port 3082 (performance testing)
- **Standard Web**: Port 80 (various container services)

---

## 🌊 **Integration with Nuru AI Ecosystem**

### **Sister Project Relationship**
Sippar leverages established infrastructure patterns from TokenHunter/Rabbi:

**Shared Infrastructure Benefits**:
- **Proven AI Architecture**: Multi-model setup with verified performance
- **Container Management**: Established deployment and scaling patterns  
- **Security Model**: Container isolation with SSH-based management
- **Monitoring Systems**: Health checking and service monitoring

### **AI Service Bridge**
```typescript
// Sippar AI Service configuration
export class SipparAIService {
  private primaryEndpoint = 'https://chat.nuru.network';
  private fallbackEndpoint = 'https://xnode2.openmesh.cloud:8080';
  
  // Utilizes XNode2 AI containers for processing
  async processAIQuery(query: string): Promise<AIResponse> {
    // Primary: Use optimized Nuru endpoint
    // Fallback: Direct XNode2 container access
  }
}
```

---

## ⚡ **Performance and Reliability**

### **Infrastructure Performance**
- **Container Startup**: Instant (persistent containers)
- **AI Response Time**: 31-91ms average processing
- **Network Latency**: Direct container communication
- **Availability**: High uptime via container persistence

### **Scalability Characteristics**
- **Horizontal Scaling**: Multiple AI containers (`ai-chat`, `ai-chat2`)
- **Load Distribution**: Service-specific container allocation
- **Resource Isolation**: Independent container resource management
- **Performance Testing**: Dedicated `scalable` container for optimization

### **Monitoring and Health Checks**
- **Container Status**: `nixos-container list` for service discovery
- **Service Health**: HTTP endpoint health checks per container
- **Resource Monitoring**: Container-level resource tracking
- **Error Handling**: Container restart capabilities via SSH management

---

## 🔗 **Official Resources**

- **OpenMesh Network**: [openmesh.network](https://openmesh.network)
- **XNode Documentation**: Available through OpenMesh developer resources
- **Container Management**: nixos-container system documentation
- **SSH Access**: Standard SSH key-based authentication

---

## 🚀 **Future Expansion**

### **Planned Enhancements**
- **Additional AI Models**: Integration of new models via container deployment
- **Service Scaling**: Dynamic container scaling based on demand
- **Multi-XNode**: Potential expansion to additional XNode infrastructure
- **Enhanced Monitoring**: Advanced container and service monitoring systems

---

**Status**: ✅ **Fully Operational** - XNode2 containers active, AI services responding, Chain Fusion backend operational