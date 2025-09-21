# 📚 CNiS-MCP API Documentation

**Version:** 1.1.0
**Protocol Support:** STDIO MCP, HTTP REST, HTTP MCP, WebSocket MCP
**Authentication:** JWT Token + API Key

## 🔒 Authentication

All API endpoints require authentication in production mode (`NODE_ENV=production`).

### Authentication Methods

#### 1. API Key Authentication
```bash
# Header-based
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/endpoint

# Query parameter (WebSocket only)
ws://localhost:3000/mcp/ws?apiKey=YOUR_API_KEY
```

#### 2. JWT Token Authentication
```bash
# Get JWT token first
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/endpoint

# WebSocket with token
ws://localhost:3000/mcp/ws?token=YOUR_JWT_TOKEN
```

## 🔗 Protocol Endpoints

### HTTP REST API

Base URL: `http://localhost:3000`

#### Authentication Endpoints

##### POST /auth/login
Authenticate with username/password to get JWT token.

**Request:**
```json
{
  "username": "your-admin-username",
  "password": "your-admin-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "permissions": ["read", "analyze", "admin"],
  "expiresIn": "24h"
}
```

##### GET /api/auth/info
Get current authentication information.

**Headers:** `x-api-key` or `Authorization: Bearer TOKEN`

**Response:**
```json
{
  "auth": {
    "authenticated": true,
    "method": "api-key",
    "permissions": ["read", "analyze", "admin"],
    "apiKeyName": "Admin API Key"
  },
  "authMethods": {
    "apiKey": {
      "header": "x-api-key",
      "description": "Provide your API key in the x-api-key header"
    },
    "jwt": {
      "header": "Authorization",
      "format": "Bearer <token>",
      "description": "Provide JWT token as Bearer token in Authorization header"
    }
  }
}
```

#### News Analysis Endpoints

##### POST /api/tools/call
Execute any MCP tool via REST API.

**Headers:** `x-api-key` or `Authorization: Bearer TOKEN`

**Request:**
```json
{
  "name": "get_top_crypto_news",
  "arguments": {
    "count": 10,
    "filter_impact": "high",
    "include_sentiment": true
  }
}
```

**Response:**
```json
{
  "result": "# 📰 Crypto News Intelligence Report\n\n**Generated:** ...",
  "executionTime": 1234,
  "timestamp": "2024-09-21T15:30:00Z"
}
```

### HTTP MCP Protocol

Base URL: `http://localhost:3000/mcp`

#### POST /mcp
JSON-RPC 2.0 endpoint for MCP protocol communication.

**Headers:**
- `Content-Type: application/json`
- `x-api-key: YOUR_API_KEY` or `Authorization: Bearer TOKEN`

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_top_crypto_news",
    "arguments": {
      "count": 10,
      "filter_impact": "high"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "# 📰 Crypto News Intelligence Report..."
      }
    ]
  }
}
```

### WebSocket MCP Protocol

URL: `ws://localhost:3000/mcp/ws`

#### Authentication
```javascript
// JWT Token (preferred)
const ws = new WebSocket('ws://localhost:3000/mcp/ws?token=YOUR_JWT_TOKEN');

// API Key
const ws = new WebSocket('ws://localhost:3000/mcp/ws?apiKey=YOUR_API_KEY');

// Header-based
const ws = new WebSocket('ws://localhost:3000/mcp/ws', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});
```

#### Message Format
```json
{
  "id": "unique-request-id",
  "type": "mcp-request",
  "method": "tools/call",
  "params": {
    "name": "get_top_crypto_news",
    "arguments": {
      "count": 5
    }
  }
}
```

## 🛠️ Available Tools

### 1. get_top_crypto_news
Get top crypto news with comprehensive intelligence analysis.

**Parameters:**
```json
{
  "count": 10,                    // Number of items (1-50)
  "filter_impact": "all",         // "all" | "high" | "critical"
  "include_sentiment": true,      // Include sentiment analysis
  "max_age_hours": 24,           // Maximum news age (1-168)
  "real_time": false             // Enable real-time streaming (WebSocket only)
}
```

**Response Format:**
```markdown
# 📰 Crypto News Intelligence Report

**Generated:** 2024-09-21T15:30:00Z
**News Items:** 10
**Protocol:** HTTP-MCP
**Request ID:** req-123

## 📊 Market Summary
- **Overall Sentiment:** OPTIMISTIC
- **High Impact News:** 3 items
- **Verified News:** 85%
- **Market Bias:** BULLISH

## 🔥 Top News
### 1. Bitcoin ETF Approval Rumors Surge
**Source:** CoinDesk (tier1 trusted)
**Analysis:**
- Credibility: 92/100 (VERIFIED)
- Impact: 87/100 (5-8% price impact)
- Sentiment: BULLISH (78/100)
```

### 2. search_crypto_news
Search crypto news by keyword with intelligent filtering.

**Parameters:**
```json
{
  "query": "bitcoin ETF",         // Search keywords (required)
  "count": 10,                   // Number of results (1-30)
  "source_tier": "tier1_trusted" // Optional tier filter
}
```

### 3. get_market_impact_news
Get high-impact news affecting crypto markets.

**Parameters:**
```json
{
  "min_impact_score": 60,        // Minimum impact score (0-100)
  "count": 15,                   // Number of items (1-30)
  "affected_assets": ["BTC", "ETH"] // Optional asset filter
}
```

### 4. analyze_news_credibility
Analyze credibility of specific news items or sources.

**Parameters:**
```json
{
  "news_url": "https://...",     // URL to analyze (optional)
  "source_name": "CoinDesk"     // Source name to analyze (optional)
}
```

### 5. get_news_by_source
Get news from specific sources with reliability analysis.

**Parameters:**
```json
{
  "source": "CoinDesk",         // Source name (required)
  "count": 10                   // Number of items (1-30)
}
```

## 🔄 MCP Protocol Methods

### initialize
Server handshake and capability exchange.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "client-name",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "realTime": true,
      "streaming": true
    },
    "serverInfo": {
      "name": "cnis-mcp-server",
      "version": "1.1.0"
    }
  }
}
```

### tools/list
List all available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "get_top_crypto_news",
        "description": "Get top crypto news with comprehensive intelligence analysis",
        "inputSchema": {
          "type": "object",
          "properties": {
            "count": {
              "type": "number",
              "description": "Number of top news items to return (1-50)",
              "default": 10,
              "minimum": 1,
              "maximum": 50
            }
          }
        },
        "streaming": true
      }
    ]
  }
}
```

### tools/call
Execute a specific tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_top_crypto_news",
    "arguments": {
      "count": 5,
      "filter_impact": "high"
    }
  }
}
```

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Description | Authentication |
|------|-------------|----------------|
| 200 | Success | ✅ Valid |
| 400 | Bad Request | ❌ Invalid input |
| 401 | Unauthorized | ❌ Missing/invalid auth |
| 403 | Forbidden | ❌ Insufficient permissions |
| 413 | Payload Too Large | ❌ Request > 10MB |
| 429 | Too Many Requests | ❌ Rate limit exceeded |
| 500 | Internal Server Error | ⚠️ Server error |

### JSON-RPC Error Codes

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC format |
| -32601 | Method not found | Unknown method |
| -32602 | Invalid params | Invalid parameters |
| -32603 | Internal error | Server error |

### Error Response Examples

**HTTP 401 Unauthorized:**
```json
{
  "error": "Authentication required",
  "message": "Please provide a valid API key or JWT token",
  "authMethods": [
    "API Key (x-api-key header)",
    "JWT (Bearer token)"
  ]
}
```

**JSON-RPC Error:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": "Parameter 'count' must be between 1 and 50"
  }
}
```

## 🚀 Rate Limiting

Default rate limits (configurable):
- **Window:** 15 minutes
- **Requests:** 100 per window per API key/IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Rate Limit Response:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 15 minutes.",
  "retryAfter": 900
}
```

## 📊 Response Times

| Endpoint | Expected Response Time |
|----------|----------------------|
| `/health` | < 200ms |
| `tools/list` | < 1 second |
| `initialize` | < 500ms |
| `tools/call` | < 30 seconds |
| WebSocket connection | < 100ms |

## 🔍 Health Check

### GET /health
Basic health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-09-21T15:30:00Z",
  "uptime": 3600,
  "version": "1.1.0",
  "environment": "production"
}
```

## 📝 Usage Examples

### Complete Workflow Example

```bash
# 1. Get JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}' \
  | jq -r '.token')

# 2. Get top crypto news
curl -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_top_crypto_news",
      "arguments": {"count": 5, "filter_impact": "high"}
    }
  }'

# 3. Search for specific news
curl -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3000/mcp \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_crypto_news",
      "arguments": {"query": "bitcoin ETF", "count": 3}
    }
  }'
```

### WebSocket Real-time Example

```javascript
const ws = new WebSocket('ws://localhost:3000/mcp/ws?token=YOUR_JWT_TOKEN');

ws.onopen = () => {
  // Subscribe to real-time updates
  ws.send(JSON.stringify({
    id: 'sub1',
    type: 'subscribe',
    params: {
      topics: ['high-impact-news', 'market-alerts']
    }
  }));

  // Request streaming news analysis
  ws.send(JSON.stringify({
    id: 'stream1',
    type: 'mcp-request',
    method: 'tools/stream',
    params: {
      name: 'get_top_crypto_news',
      arguments: {count: 10, real_time: true}
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};
```

## 🔗 Integration Libraries

### JavaScript/Node.js
```javascript
// Using axios for HTTP MCP
const axios = require('axios');

const mcpClient = axios.create({
  baseURL: 'http://localhost:3000/mcp',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

async function getTopNews(count = 10) {
  const response = await mcpClient.post('/', {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: {
      name: 'get_top_crypto_news',
      arguments: { count }
    }
  });
  return response.data.result;
}
```

### Python
```python
import requests
import json

class CNiSMCPClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }

    def call_tool(self, tool_name, arguments=None):
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {}
            }
        }

        response = requests.post(
            f"{self.base_url}/mcp",
            headers=self.headers,
            data=json.dumps(payload)
        )
        return response.json()

# Usage
client = CNiSMCPClient('http://localhost:3000', 'YOUR_API_KEY')
news = client.call_tool('get_top_crypto_news', {'count': 5})
```

---

**Documentation Version:** 1.1.0
**Last Updated:** 2024-09-21
**Support:** See README.md for support information