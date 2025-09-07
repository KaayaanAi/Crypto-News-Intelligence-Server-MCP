# 🧪 CNiS-MCP Testing Guide

This guide covers comprehensive testing of the Crypto News Intelligence Server MCP across all three protocols.

## 📋 **Pre-Testing Checklist**

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] Build directory exists with executable permissions
- [ ] Environment configured (`.env` file)

## ⚡ **Quick Test Commands**

```bash
# 1. Build and compile
npm run build

# 2. Test with MCP Inspector (STDIO)
npm run inspector

# 3. Test HTTP Server mode
npm run dev:http

# 4. Health check (HTTP mode)
curl http://localhost:3000/health
```

## 🔧 **1. STDIO MCP Protocol Testing**

### **1.1 MCP Inspector Testing**

The official MCP Inspector provides the best testing experience:

```bash
# Start MCP Inspector
npm run inspector

# Or manually:
npx @modelcontextprotocol/inspector build/index.js
```

**Expected Results:**
- ✅ Server initializes without errors
- ✅ All 5 tools are listed
- ✅ Tool schemas are properly formatted
- ✅ Each tool executes successfully

### **1.2 Manual JSON-RPC Testing**

Test the raw MCP protocol:

```bash
# Test 1: Server Initialization
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | timeout 10s ./build/index.js
```

**Expected Response:**
```json
{
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}},
    "serverInfo": {"name": "cnis-mcp-server", "version": "1.0.0"}
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

```bash
# Test 2: Tools Listing
echo -e '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}\n{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}' | timeout 10s ./build/index.js
```

**Expected Response:**
- Array of 5 tools with proper schemas
- Tool names: `get_top_crypto_news`, `search_crypto_news`, etc.

```bash
# Test 3: Tool Execution
echo -e '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}\n{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "get_top_crypto_news", "arguments": {"count": 5}}}' | timeout 30s ./build/index.js
```

### **1.3 Claude Desktop Integration**

```bash
# Install globally for Claude Desktop
npm install -g .

# Or install via npx
claude mcp add cnis-mcp-server npx -s user cnis-mcp-server

# Restart Claude Desktop
# Press Ctrl+C twice, then: claude --continue
```

**Test in Claude Desktop:**
```
Please use the get_top_crypto_news tool to show me the latest crypto news with analysis.
```

## 🌐 **2. HTTP REST API Testing**

### **2.1 Start HTTP Server**

```bash
# Method 1: Environment variable
HTTP_MODE=true npm start

# Method 2: Script
npm run start:http

# Method 3: Direct execution
HTTP_MODE=true node build/index.js
```

### **2.2 Health Check**

```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "mode": "HTTP",
  "cache": {
    "size": 0,
    "lastUpdate": null
  },
  "timestamp": "2024-01-XX"
}
```

### **2.3 API Endpoint Testing**

#### **Top Crypto News**
```bash
curl -X POST http://localhost:3000/api/news/top \
  -H "Content-Type: application/json" \
  -d '{
    "count": 5,
    "filter_impact": "high",
    "include_sentiment": true
  }' | jq .
```

#### **Search News**
```bash
curl -X POST http://localhost:3000/api/news/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "bitcoin ETF",
    "count": 3,
    "source_tier": "tier1_trusted"
  }' | jq .
```

#### **High-Impact News**
```bash
curl -X POST http://localhost:3000/api/news/impact \
  -H "Content-Type: application/json" \
  -d '{
    "min_impact_score": 70,
    "count": 5,
    "affected_assets": ["BTC", "ETH"]
  }' | jq .
```

### **2.4 Error Handling Tests**

```bash
# Test invalid parameters
curl -X POST http://localhost:3000/api/news/top \
  -H "Content-Type: application/json" \
  -d '{"count": "invalid"}' | jq .

# Test missing parameters
curl -X POST http://localhost:3000/api/news/search \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
```

## 🔗 **3. HTTP MCP Protocol Testing**

### **3.1 MCP Protocol Endpoint**

The HTTP MCP endpoint accepts JSON-RPC 2.0 requests:

```bash
# Test tools/list
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }' | jq .
```

```bash
# Test tools/call
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_top_crypto_news",
      "arguments": {"count": 3}
    }
  }' | jq .
```

### **3.2 n8n Integration Testing**

1. **Install n8n-nodes-mcp**
2. **Create MCP Client node**
3. **Configure connection**:

```json
{
  "connectionType": "http",
  "httpEndpoint": "http://localhost:3000/mcp",
  "headers": {
    "Content-Type": "application/json"
  }
}
```

4. **Test tool calls in n8n workflow**

## 🐳 **4. Docker Testing**

### **4.1 Build Docker Image**

```bash
# Build image
docker build -t cnis-mcp .

# Verify image
docker images | grep cnis-mcp
```

### **4.2 Test STDIO Mode**

```bash
# Run in STDIO mode
docker run -it --rm cnis-mcp

# Test with echo
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | docker run -i --rm cnis-mcp
```

### **4.3 Test HTTP Mode**

```bash
# Run HTTP server
docker run -p 3000:3000 -e HTTP_MODE=true cnis-mcp

# Test health check
curl http://localhost:3000/health
```

### **4.4 Docker Compose Testing**

```bash
# Test STDIO mode
docker-compose up cnis-mcp-server

# Test HTTP mode
docker-compose --profile http up cnis-mcp-http

# Test with logs
docker-compose logs -f cnis-mcp-server
```

## 🧪 **5. Comprehensive Test Suite**

Create a test script for automated testing:

```bash
#!/bin/bash
# test-all.sh - Comprehensive testing script

echo "🧪 CNiS-MCP Comprehensive Test Suite"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((FAILED++))
    fi
}

# Test 1: Build
npm run build > /dev/null 2>&1
test_result $? "TypeScript compilation"

# Test 2: File permissions
[ -x "./build/index.js" ]
test_result $? "Build executable permissions"

# Test 3: STDIO initialization
timeout 5s echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | ./build/index.js > /dev/null 2>&1
test_result $? "STDIO MCP initialization"

# Test 4: HTTP server start
HTTP_MODE=true timeout 10s node build/index.js > /dev/null 2>&1 &
HTTP_PID=$!
sleep 3
curl -s http://localhost:3000/health > /dev/null 2>&1
test_result $? "HTTP server startup"
kill $HTTP_PID 2>/dev/null

# Test 5: Docker build
docker build -t cnis-mcp-test . > /dev/null 2>&1
test_result $? "Docker image build"

# Results
echo ""
echo "Test Results: ${PASSED} passed, ${FAILED} failed"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}💥 Some tests failed!${NC}"
    exit 1
fi
```

## 📊 **6. Performance Testing**

### **6.1 Load Testing**

```bash
# Install Apache Bench (if not installed)
# sudo apt-get install apache2-utils  # Ubuntu
# brew install httpie  # macOS

# Test concurrent requests
ab -n 100 -c 10 -p post_data.json -T application/json http://localhost:3000/api/news/top

# post_data.json content:
{"count": 5}
```

### **6.2 Memory Usage**

```bash
# Monitor memory usage
docker stats cnis-mcp-server

# Or with regular node
ps aux | grep "node build/index.js"
```

### **6.3 Response Time Testing**

```bash
# Test response times
for i in {1..10}; do
  time curl -s http://localhost:3000/api/news/top \
    -H "Content-Type: application/json" \
    -d '{"count": 5}' > /dev/null
done
```

## 🔍 **7. Debugging and Troubleshooting**

### **7.1 Common Issues**

| Issue | Solution |
|-------|----------|
| "Permission denied" on build/index.js | `chmod +x build/index.js` |
| "Module not found" errors | `npm install` |
| "Port already in use" | Change PORT in .env or kill process |
| "Timeout" in STDIO tests | Increase timeout or check RSS feeds |

### **7.2 Debug Mode**

```bash
# Enable debug logging
DEBUG=* npm run dev

# Or set log level
LOG_LEVEL=DEBUG npm start
```

### **7.3 RSS Feed Testing**

```bash
# Test individual RSS feeds
curl -s "https://www.coindesk.com/arc/outboundfeeds/rss/" | head -20

# Test RSS parsing
node -e "
const Parser = require('rss-parser');
const parser = new Parser();
parser.parseURL('https://cointelegraph.com/rss')
  .then(feed => console.log('✅', feed.title, feed.items.length, 'items'))
  .catch(err => console.error('❌', err.message));
"
```

## ✅ **8. Success Criteria**

### **STDIO MCP Protocol**
- [ ] Initializes without errors
- [ ] Lists all 5 tools correctly  
- [ ] Each tool executes successfully
- [ ] Error handling works for invalid inputs
- [ ] Works with MCP Inspector
- [ ] Integrates with Claude Desktop

### **HTTP REST API**
- [ ] Server starts on configured port
- [ ] Health check returns 200 OK
- [ ] All API endpoints respond correctly
- [ ] JSON responses are well-formatted
- [ ] Error responses include proper status codes
- [ ] CORS headers are present

### **HTTP MCP Protocol**
- [ ] Accepts JSON-RPC 2.0 requests
- [ ] Returns proper MCP responses
- [ ] Works with n8n-nodes-mcp
- [ ] Error handling follows JSON-RPC spec

### **Docker Deployment**
- [ ] Image builds successfully
- [ ] Container runs in both modes
- [ ] Health checks pass
- [ ] Environment variables work
- [ ] Docker Compose orchestration works

### **Performance**
- [ ] Response time < 5 seconds for fresh data
- [ ] Response time < 1 second for cached data
- [ ] Memory usage < 100MB typical
- [ ] Handles 50+ concurrent requests
- [ ] Cache invalidation works correctly

---

**🎯 Target: 100% test success rate across all protocols**

Run the full test suite with: `./test-all.sh`