# 📰 CNiS-MCP: Crypto News Intelligence Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org)
[![MCP Protocol](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io)

> **Advanced crypto news intelligence with triple protocol support**
> 
> 🔄 **STDIO MCP** | 🌐 **HTTP REST** | 🔗 **HTTP MCP Protocol**

## 🚀 Features

### 📊 **Intelligence Analysis**
- **Credibility Scoring**: AI-powered source verification and fact-checking
- **Impact Analysis**: Market impact prediction with price effect estimates
- **Sentiment Analysis**: Multi-dimensional sentiment scoring
- **Cross-Reference Verification**: News validation across multiple sources

### 🔗 **Triple Protocol Support**
- **STDIO MCP**: Direct integration with Claude Desktop
- **HTTP REST API**: Standard REST endpoints for web applications
- **HTTP MCP Protocol**: n8n-nodes-mcp compatibility

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

## ⚡ **Quick Start**

### 1. **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd cnis-mcp

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env
```

### 2. **Development Mode**

```bash
# STDIO MCP Mode (for Claude Desktop)
npm run dev

# HTTP Server Mode (for web applications)
npm run dev:http
```

### 3. **Production Deployment**

```bash
# Build the project
npm run build

# STDIO mode
npm start

# HTTP mode
HTTP_MODE=true npm start
```

### 4. **Docker Deployment**

```bash
# STDIO mode
docker-compose up cnis-mcp-server

# HTTP mode
docker-compose --profile http up cnis-mcp-http
```

## 🔧 **Configuration**

### Environment Variables

```bash
# Server Configuration
HTTP_MODE=false                    # STDIO or HTTP mode
PORT=3000                         # HTTP server port

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

### **HTTP REST API**

Base URL: `http://localhost:3000`

```bash
# Get top crypto news
curl -X POST http://localhost:3000/api/news/top \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "filter_impact": "high"}'

# Search news
curl -X POST http://localhost:3000/api/news/search \
  -H "Content-Type: application/json" \
  -d '{"query": "bitcoin ETF", "count": 5}'

# Get high-impact news
curl -X POST http://localhost:3000/api/news/impact \
  -H "Content-Type: application/json" \
  -d '{"min_impact_score": 70, "count": 10}'

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