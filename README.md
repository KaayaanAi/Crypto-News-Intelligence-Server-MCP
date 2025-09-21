# 📰 CNiS-MCP: Crypto News Intelligence Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org)
[![MCP Protocol](https://img.shields.io/badge/MCP-2024--11--05-purple.svg)](https://modelcontextprotocol.io)
[![Docker](https://img.shields.io/badge/Docker-22--alpine-blue.svg)](https://hub.docker.com/)
[![n8n Compatible](https://img.shields.io/badge/n8n-Compatible-orange.svg)](https://n8n.io)
[![Security](https://img.shields.io/badge/Security-Hardened-red.svg)](CHANGELOG.md#security-enhancements)

> **Advanced crypto news intelligence with triple protocol support and enterprise security**
>
> 🔄 **STDIO MCP** | 🌐 **HTTP REST** | 🔗 **HTTP MCP Protocol** | ⚡ **WebSocket MCP**

## 🚀 Features

### 📊 **Intelligence Analysis**
- **Credibility Scoring**: AI-powered source verification and fact-checking
- **Impact Analysis**: Market impact prediction with price effect estimates
- **Sentiment Analysis**: Multi-dimensional sentiment scoring
- **Cross-Reference Verification**: News validation across multiple sources

### 🔗 **Triple Protocol Support**
- **STDIO MCP**: Direct integration with Claude Desktop
- **HTTP REST API**: Standard REST endpoints for web applications
- **HTTP MCP Protocol**: Full n8n-nodes-mcp compatibility with JSON-RPC 2.0
- **WebSocket MCP**: Real-time streaming support for live updates

### 📡 **Free Data Sources**
- **100% Free RSS Feeds**: No API keys required for basic functionality
- **11 Trusted Sources**: CoinDesk, Cointelegraph, The Block, and more
- **Official Sources**: SEC, Federal Reserve regulatory updates
- **On-Chain Analytics**: Glassnode and CryptoQuant insights

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   RSS Feeds     │───▶│  News Collector  │───▶│ Intelligence    │
│ (11 Sources)    │    │  & Aggregator    │    │ Engine          │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐            ▼
│ STDIO MCP       │◄───┤                  │    ┌─────────────────┐
│ HTTP REST API   │    │  Triple Protocol │◄───│ Analyzed News   │
│ HTTP MCP        │    │  Server          │    │ + Scoring       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🏆 **MCP Standards Compliance**

CNiS-MCP Server is fully compliant with MCP Protocol 2024-11-05 standards:

### ✅ **Required Methods**
- `initialize` - Server handshake and capability exchange (< 500ms)
- `tools/list` - List all available news analysis tools (< 1s)
- `tools/call` - Execute crypto news analysis tools (< 30s)

### ✅ **Optional Methods (Implemented)**
- `resources/list` - List available news data resources
- `resources/read` - Access live crypto news streams
- `prompts/list` - List available analysis prompt templates
- `prompts/get` - Generate specialized crypto analysis prompts

### ✅ **JSON-RPC 2.0 Compliance**
- Strict JSON-RPC 2.0 format validation
- Proper error codes (-32700 to -32099)
- Batch request support
- Response time SLAs met

### ✅ **n8n Integration Ready**
- Full compatibility with n8n-nodes-mcp
- CORS headers configured
- Request/response validation
- Production-grade error handling

### ✅ **Enterprise Security**
- **Environment-based authentication**: No hardcoded credentials
- **JWT token authentication**: 32+ character secrets required
- **WebSocket authentication**: Authenticated real-time connections
- **Input validation**: Comprehensive Zod schema validation
- **Rate limiting**: Configurable request limiting (100 req/15min default)
- **Request sanitization**: XSS and injection protection
- **Security headers**: CORS, CSP, XSS protection
- **Zero vulnerabilities**: No npm security issues
- **Production hardening**: Docker health checks and security scanning

## ⚡ **Quick Start**

### 1. **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd cnis-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. **Security Configuration** ⚠️ **Required**

Create and configure your environment file:

```bash
# Copy environment template
cp .env.example .env

# Configure required security variables
nano .env
```

**Required Environment Variables:**
```bash
# Authentication (REQUIRED for production)
JWT_SECRET="your-secure-jwt-secret-minimum-32-characters-long"
ADMIN_USERNAME="your-admin-username"
ADMIN_PASSWORD="your-secure-admin-password"
ADMIN_API_KEY="your-admin-api-key-for-authentication"

# Server configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security settings
AUTH_ENABLED=true
RATE_LIMIT_ENABLED=true
```

> **🔒 Security Note**: Never use default or weak credentials in production. Generate strong, unique values for all authentication variables.

### 3. **Development Mode**

```bash
# STDIO MCP Mode (for Claude Desktop) - Auth disabled by default
NODE_ENV=development npm run dev

# HTTP Server Mode (for web applications) - Auth disabled by default
NODE_ENV=development npm run dev:http

# WebSocket Mode (for real-time applications)
NODE_ENV=development npm run dev:websocket

# Full Protocol Mode (all protocols enabled)
NODE_ENV=development npm run dev:full
```

### 4. **Production Deployment** 🔒

**Pre-deployment Security Checklist:**
- [ ] Strong JWT_SECRET configured (32+ characters)
- [ ] Admin credentials set (no defaults)
- [ ] AUTH_ENABLED=true
- [ ] NODE_ENV=production
- [ ] All environment variables validated

```bash
# Build and validate
npm run build
npm audit  # Should show 0 vulnerabilities

# STDIO mode (secure)
npm start

# HTTP mode (with authentication)
HTTP_MODE=true npm start

# WebSocket mode (with authentication)
WEBSOCKET_MODE=true npm start

# Full mode (all protocols with authentication)
FULL_MODE=true npm start
```

### 5. **Docker Deployment** 🐳

**Create secure environment file for Docker:**
```bash
# Copy and configure environment
cp .env.example .env.docker
# Edit .env.docker with production values
```

```bash
# Build secure image
docker build -t cnis-mcp:1.1.0 .

# STDIO mode (secure)
docker run --env-file .env.docker cnis-mcp:1.1.0

# HTTP mode (with authentication)
docker run --env-file .env.docker -p 3000:3000 -e HTTP_MODE=true cnis-mcp:1.1.0

# Using docker-compose (recommended)
docker-compose --env-file .env.docker up
```

**Docker Security Features:**
- Non-root user (nodejs:1001)
- Minimal Alpine base image
- Health checks enabled
- Secure environment variable handling

## 🔒 **Security Configuration**

### Authentication Methods

#### 1. **JWT Token Authentication**
```bash
# Generate and set JWT secret (32+ characters required)
JWT_SECRET="your-super-secure-jwt-secret-key-32-chars-minimum"

# Admin credentials for JWT generation
ADMIN_USERNAME="your-admin-username"
ADMIN_PASSWORD="your-secure-admin-password"
```

#### 2. **API Key Authentication**
```bash
# Set admin API key for direct access
ADMIN_API_KEY="your-generated-admin-api-key-here"

# Optional demo key (development only)
DEMO_API_KEY="your-demo-key-here"  # Only when NODE_ENV=development
```

#### 3. **WebSocket Authentication**
WebSocket connections support both authentication methods:
```javascript
// JWT Token (preferred)
const ws = new WebSocket('ws://localhost:3000/mcp/ws?token=YOUR_JWT_TOKEN');

// API Key
const ws = new WebSocket('ws://localhost:3000/mcp/ws?apiKey=YOUR_API_KEY');

// Header-based (alternative)
const ws = new WebSocket('ws://localhost:3000/mcp/ws', {
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    // or
    'x-api-key': 'YOUR_API_KEY'
  }
});
```

### Production Security Checklist

- [ ] **Strong JWT Secret**: 32+ characters, randomly generated
- [ ] **Secure Admin Credentials**: No default usernames/passwords
- [ ] **Environment Variables**: All credentials in environment, not code
- [ ] **HTTPS Enabled**: Use reverse proxy (nginx/Apache) for HTTPS
- [ ] **Rate Limiting**: Enabled and configured for your use case
- [ ] **CORS Policy**: Configured for your allowed origins
- [ ] **Firewall Rules**: Restrict access to necessary IPs only
- [ ] **Regular Updates**: Keep dependencies updated (`npm audit`)

## 🔧 **Configuration**

### Environment Variables

```bash
# Security Configuration (REQUIRED)
JWT_SECRET="your-jwt-secret-32-chars-minimum"
ADMIN_USERNAME="your-admin-username"
ADMIN_PASSWORD="your-secure-admin-password"
ADMIN_API_KEY="your-admin-api-key"
AUTH_ENABLED=true

# Server Configuration
NODE_ENV=production               # production/development
MCP_MODE=stdio                    # stdio/http/websocket/full
PORT=3000                         # HTTP server port
HOST=0.0.0.0                      # Bind address

# Security Settings
RATE_LIMIT_ENABLED=true          # Enable rate limiting
RATE_LIMIT_MAX_REQUESTS=100      # Requests per window
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes window
CORS_ORIGIN=*                    # Allowed CORS origins

# News Settings
CACHE_TTL_MINUTES=15              # Cache duration
MAX_NEWS_AGE_HOURS=24            # News age limit
CREDIBILITY_THRESHOLD=40          # Minimum credibility score
IMPACT_THRESHOLD=50               # Minimum impact score
```

### RSS News Sources

| Tier | Source | URL | Status |
|------|--------|-----|--------|
| **Tier 1** | CoinDesk | `coindesk.com/rss` | ✅ Active |
| **Tier 1** | Cointelegraph | `cointelegraph.com/rss` | ✅ Active |
| **Tier 1** | The Block | `theblock.co/rss.xml` | ✅ Active |
| **Tier 1** | Decrypt | `decrypt.co/feed` | ✅ Active |
| **Tier 1** | Bitcoin Magazine | `bitcoinmagazine.com/rss` | ✅ Active |
| **Official** | SEC Press | `sec.gov/rss` | ✅ Active |
| **Analytics** | Glassnode | `insights.glassnode.com/rss` | ✅ Active |

## 🔗 **Integration Guides**

### **Claude Desktop Integration**

1. **Install the MCP server**:
```bash
npm install -g cnis-mcp-server
# or via npx
claude mcp add cnis-mcp-server npx -s user cnis-mcp-server
```

2. **Restart Claude Desktop**:
```bash
# Press Ctrl+C twice, then:
claude --continue
```

3. **Available tools in Claude**:
- `get_top_crypto_news` - Get analyzed top news
- `search_crypto_news` - Search by keywords
- `get_market_impact_news` - High-impact news only
- `analyze_news_credibility` - Credibility analysis
- `get_news_by_source` - Source-specific news

### **HTTP REST API** 🔐

Base URL: `http://localhost:3000`

#### Authentication Required

**Option 1: API Key Authentication**
```bash
# Get top crypto news
curl -X POST http://localhost:3000/api/news/top \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"count": 10, "filter_impact": "high"}'

# Search news
curl -X POST http://localhost:3000/api/news/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"query": "bitcoin ETF", "count": 5}'
```

**Option 2: JWT Token Authentication**
```bash
# First, get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your-admin-username", "password": "your-admin-password"}'

# Use JWT token for API calls
curl -X POST http://localhost:3000/api/news/top \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"count": 10, "filter_impact": "high"}'

# Get high-impact news with JWT
curl -X POST http://localhost:3000/api/news/impact \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"min_impact_score": 70, "count": 10}'
```

#### WebSocket MCP Protocol
```bash
# Authenticated WebSocket connection
wscat -c "ws://localhost:3000/mcp/ws?token=YOUR_JWT_TOKEN"

# Send MCP request
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_top_crypto_news",
    "arguments": {"count": 10, "filter_impact": "high"}
  }
}
```

# Health check
curl http://localhost:3000/health
```

### **n8n Integration**

1. **Install n8n MCP Client node**
2. **Configure MCP connection**:
```json
{
  "nodeType": "MCP Client",
  "connection": {
    "type": "Command Line (STDIO)",
    "command": "docker exec -i cnis-mcp-server node /app/build/index.js"
  },
  "tools": [
    "get_top_crypto_news",
    "search_crypto_news", 
    "get_market_impact_news"
  ]
}
```

3. **HTTP MCP Protocol** (alternative):
```json
{
  "endpoint": "http://localhost:3000/mcp",
  "method": "POST",
  "headers": {"Content-Type": "application/json"}
}
```

## 📊 **API Reference**

### **Tools Overview**

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `get_top_crypto_news` | Analyzed top news with intelligence scoring | `count`, `filter_impact`, `include_sentiment` |
| `search_crypto_news` | Search news by keywords | `query`, `count`, `source_tier` |
| `get_market_impact_news` | High-impact market-moving news | `min_impact_score`, `affected_assets` |
| `analyze_news_credibility` | Credibility analysis of specific URL | `news_url` |
| `get_news_by_source` | News from specific source | `source`, `count` |

### **Response Format**

```json
{
  "timestamp": "2024-01-XX",
  "news_count": 10,
  "market_summary": {
    "overall_sentiment": "CAUTIOUS",
    "high_impact_count": 3,
    "verified_news_percentage": 78,
    "market_bias": "NEUTRAL",
    "dominant_narrative": "regulatory uncertainty"
  },
  "top_news": [
    {
      "rank": 1,
      "title": "SEC Delays Bitcoin ETF Decision",
      "source": "CoinDesk",
      "analysis": {
        "credibility_score": 95,
        "impact_score": 88,
        "sentiment": "NEGATIVE",
        "importance": "CRITICAL",
        "affected_assets": ["BTC", "MARKET_WIDE"],
        "price_impact": "HIGH (±5-15%)"
      },
      "recommendation": {
        "action": "BEARISH_SIGNAL",
        "reason": "High impact regulation news",
        "urgency": "HIGH"
      }
    }
  ]
}
```

### **Intelligence Scoring**

#### **Credibility Score (0-100)**
- **80-100**: VERIFIED - Multiple trusted sources
- **60-79**: LIKELY_TRUE - Credible source, needs verification  
- **40-59**: UNVERIFIED - Uncertain reliability
- **0-39**: LIKELY_FALSE - Poor source or suspicious content

#### **Impact Score (0-100)**
- **80-100**: CRITICAL - Major market impact expected (±5-15%)
- **60-79**: HIGH - Significant impact likely (±2-5%)
- **40-59**: MEDIUM - Moderate impact possible (±1-2%)
- **0-39**: LOW - Minimal impact expected (<1%)

#### **Sentiment Analysis**
- **VERY_POSITIVE**: 80-100
- **POSITIVE**: 65-79  
- **NEUTRAL**: 35-64
- **NEGATIVE**: 20-34
- **VERY_NEGATIVE**: 0-19

## 🛠️ **Development**

### **Project Structure**

```
src/
├── index.ts              # Main server (STDIO + HTTP)
├── types.ts              # TypeScript interfaces
├── config.ts             # Configuration & RSS sources
├── news-collector.ts     # RSS aggregation & caching
└── news-analyzer.ts      # Intelligence analysis engine
```

### **Testing**

```bash
# Build and test with MCP Inspector
npm run build
npm run inspector

# Test HTTP endpoints
npm run dev:http
curl http://localhost:3000/health

# Test specific functionality
node -e "
const { NewsCollector } = require('./build/news-collector.js');
const collector = new NewsCollector();
collector.collectAllNews().then(console.log);
"
```

### **Key Features Implementation**

#### **RSS Collection**
- Parallel fetching from 11 sources
- 15-minute intelligent caching
- Duplicate detection and merging
- Source tier prioritization

#### **Intelligence Analysis**
- Rule-based credibility scoring
- Impact category detection
- Sentiment keyword analysis
- Cross-reference validation

#### **Performance Optimization**
- In-memory caching with TTL
- Parallel RSS processing
- Optimized deduplication
- Graceful error handling

## 🔒 **Security**

### **Data Privacy**
- **No API keys required** for basic functionality
- **No external AI services** - all analysis is local
- **No user data storage** - stateless operation
- **Open source transparency**

### **Production Security**
- Non-root Docker user
- Environment variable isolation
- Input validation with Zod
- Rate limiting ready
- CORS configuration

## 📈 **Performance Metrics**

- **News Sources**: 11 RSS feeds
- **Update Frequency**: 15 minutes (configurable)
- **Cache Duration**: 15 minutes (configurable)
- **Response Time**: <2 seconds for cached data
- **Memory Usage**: ~50MB typical
- **Concurrent Support**: 100+ requests/second

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch: `git checkout -b feature/awesome-feature`
3. Commit changes: `git commit -m 'Add awesome feature'`
4. Push branch: `git push origin feature/awesome-feature`
5. Open Pull Request

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 **Links**

- **MCP Protocol**: https://modelcontextprotocol.io
- **Claude Desktop**: https://claude.ai/desktop
- **n8n Automation**: https://n8n.io
- **TypeScript**: https://www.typescriptlang.org
- **RSS Specification**: https://www.rssboard.org/rss-specification

---

**Built with ❤️ for the crypto community by Kaayaan Infrastructure**

*Empowering intelligent decision-making through advanced news analysis*