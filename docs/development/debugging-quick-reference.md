# Debugging Quick Reference Guide

**Version**: 1.0  
**Last Updated**: September 7, 2025  
**Source**: Sprint 009 systematic debugging success  

---

## 🚀 **Quick Start Debugging Framework**

When facing any issue, follow this 5-step process:

1. **🎯 Define** - What exactly is failing?
2. **🗺️ Map** - What components are involved?
3. **🔍 Test** - Which component is actually failing?
4. **💡 Identify** - Why is it failing?
5. **🔧 Fix** - Solve the root cause, not symptoms

---

## 📋 **Debugging Checklist**

### **Step 1: Problem Definition** ✅
- [ ] Exact error messages captured
- [ ] Reproduction steps documented  
- [ ] Expected vs actual behavior defined
- [ ] Environmental context noted (network, time, conditions)

### **Step 2: Component Mapping** 🗺️
- [ ] All involved services listed
- [ ] Architecture diagram referenced or created
- [ ] Data flow path mapped
- [ ] Dependencies identified

### **Step 3: Individual Testing** 🔍
- [ ] Each service tested in isolation
- [ ] API endpoints verified individually
- [ ] Configuration checked for each component
- [ ] Network connectivity confirmed

### **Step 4: Root Cause Identification** 💡
- [ ] Specific failing component identified
- [ ] Failure reason understood (config, code, environment)
- [ ] Root cause vs symptom distinguished
- [ ] Impact scope assessed

### **Step 5: Systematic Resolution** 🔧
- [ ] Root cause addressed (not symptoms)
- [ ] Comprehensive solution implemented
- [ ] Fix tested and verified
- [ ] Related issues resolved
- [ ] Documentation updated

---

## 🛠️ **Common Issue Patterns & Solutions**

### **🔧 API/Service Issues**

**Pattern**: Service not responding or returning errors
```bash
# Quick diagnosis
curl -s http://service/health -w " (Status: %{http_code})\n"
curl -s http://service/endpoint | jq '.'

# Check service logs
journalctl -u service-name -n 50 --no-pager
```

**Common Causes**:
- Service not running: `systemctl status service-name`
- Wrong endpoint: Check API documentation
- Network issues: Verify connectivity and ports
- Configuration errors: Review environment variables

---

### **🔑 Authentication/Authorization Issues**

**Pattern**: 401, 403 errors or "Principal parsing failed"
```bash
# Verify authentication format
echo "Principal: $PRINCIPAL"
curl -X POST -H "Content-Type: application/json" \
  -d '{"principal": "valid-format"}' http://service/auth
```

**Common Causes**:
- Invalid format: Check required format (e.g., ICP Principal format)
- Missing credentials: Verify environment variables
- Expired tokens: Check token validity
- Wrong permissions: Verify access rights

**Sprint 009 Example**: `'sippar-oracle-backend-v1'` → `'2vxsx-fae'` (valid ICP Principal)

---

### **🔗 Integration Issues**

**Pattern**: Services work individually but fail when integrated
```bash
# Test service chain
curl -s http://service1/endpoint
curl -s http://service2/endpoint  
curl -s http://integration/test

# Check routing configuration
cat config/routing.json
```

**Common Causes**:
- Service routing confusion: Multiple services providing similar functionality
- Algorithm mismatches: Different cryptographic implementations
- Data format incompatibilities: JSON vs binary, encoding differences
- Network routing: Services calling wrong endpoints

**Sprint 009 Example**: Chain-fusion backend (SHA-256) vs ICP canister (SHA-512/256)

---

### **📊 Performance Issues**

**Pattern**: Slow responses or timeouts
```bash
# Measure response times
time curl -s http://service/endpoint
curl -s http://service/metrics | jq '.performance'

# Check resource usage
curl -s http://service/health | jq '.memory, .cpu'
```

**Common Causes**:
- Resource constraints: High CPU/memory usage
- Network latency: Slow external API calls  
- Database performance: Slow queries
- Inefficient algorithms: O(n²) operations

---

### **🔍 Compatibility Issues**

**Pattern**: "Format not supported" or validation failures
```bash
# Test compatibility
curl -s http://service/validate -d '{"data": "test"}'

# Check algorithm implementations
node -e "console.log(crypto.createHash('sha512-256').update('test').digest().toString('hex'))"
```

**Common Causes**:
- Algorithm differences: Different hash functions, encoding methods
- Version mismatches: API version incompatibilities
- Format requirements: Strict validation rules
- Standard compliance: Protocol specification differences

**Sprint 009 Example**: SHA-512/256 requirement for AlgoSDK compatibility

---

## 🎯 **Sprint 009 Success Example**

**Problem**: Oracle initialization failing intermittently

**Application of Framework**:

1. **Define**: "Principal parsing failed" error during Oracle account initialization
2. **Map**: Frontend → Backend → ThresholdSignerService → ICP Canister
3. **Test**: Direct ICP canister calls worked, service initialization failed
4. **Identify**: Invalid Principal format `'sippar-oracle-backend-v1'` in code
5. **Fix**: Changed to valid ICP Principal `'2vxsx-fae'`, system now 100% reliable

**Result**: 100% success rate, production-ready Oracle system

---

## 🚨 **Emergency Debugging Commands**

### **Service Status Check**
```bash
# Quick service health check
curl -s http://nuru.network:3004/health | jq '.'

# Check specific service
curl -s http://nuru.network:3004/api/v1/ai-oracle/status | jq '.oracle.isMonitoring'

# System logs
journalctl -u sippar-backend -n 20 --no-pager
```

### **Network Connectivity**
```bash
# Test connectivity
ping nuru.network
telnet nuru.network 3004

# Check port access
nmap -p 3004 nuru.network
```

### **Configuration Verification**
```bash
# Check environment
env | grep -i oracle
env | grep -i algo

# Verify files
ls -la /var/www/nuru.network/sippar-backend/.env
```

---

## 📚 **Documentation and Verification**

### **Document Your Investigation**
```markdown
## Issue: [Brief Description]
**Date**: [Date]
**Symptoms**: [Exact error messages and behavior]

### Investigation
1. **Components Checked**: [List all services/components tested]
2. **Root Cause**: [Specific cause identified]
3. **Solution**: [What was changed]
4. **Verification**: [How success was confirmed]

### Prevention
- [ ] Documentation updated
- [ ] Monitoring improved
- [ ] Similar issues prevented
```

### **Verification Commands**
Always verify your fix works:
```bash
# Test the fix
curl -s http://service/endpoint | jq '.success'

# Verify performance
time curl -s http://service/endpoint

# Check logs for errors
journalctl -u service -n 10 --no-pager | grep -i error
```

---

## 🔄 **Common Anti-Patterns to Avoid**

### **❌ Bad Debugging Practices**
- **Symptom Fixing**: Implementing workarounds without understanding root causes
- **Assumption Debugging**: Guessing without systematic testing
- **Documentation Hallucination**: Documenting fixes without verification
- **Quick Fix Mentality**: Applying temporary solutions under pressure

### **✅ Good Debugging Practices**  
- **Systematic Investigation**: Follow the 5-step framework consistently
- **Root Cause Focus**: Always ask "why is this happening?"
- **Verification-Driven**: Test every assumption and document results
- **Learning Orientation**: Document insights for future reference

---

## 🎓 **Learning from Each Debug Session**

### **Post-Debug Checklist**
- [ ] Root cause clearly identified and documented
- [ ] Solution implemented and tested
- [ ] Similar issues prevented through improved design
- [ ] Team knowledge updated
- [ ] Monitoring/alerting improved

### **Knowledge Sharing**
- Create case studies for complex issues
- Update this guide with new patterns
- Share debugging insights with team
- Improve system design based on learnings

---

**Remember**: Every debugging session is a learning opportunity. The Sprint 009 success came from refusing to accept workarounds and systematically investigating until the root cause was found and fixed.

**Need Help?** Reference the [full Development Best Practices guide](/docs/development/best-practices.md) for comprehensive debugging methodology.

---

*Quick Reference Updated*: September 7, 2025  
*Based on*: Sprint 009 systematic debugging success  
*Next Update*: After additional debugging insights are gathered