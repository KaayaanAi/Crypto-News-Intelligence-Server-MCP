# Changelog

All notable changes to the CNiS-MCP (Crypto News Intelligence Server) project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-09-21

### 🔒 Security Enhancements

#### Added
- **Environment-based authentication**: All credentials now require environment variables
- **WebSocket authentication**: Full authentication for WebSocket connections
- **JWT secret validation**: Mandatory 32+ character secrets with production enforcement
- **Enhanced input validation**: Comprehensive Zod schema validation for all tool inputs
- **Security middleware improvements**: Better JSON-RPC error handling and request sanitization

#### Changed
- **Authentication system**: Migrated from hardcoded credentials to environment-based configuration
- **API key management**: Removed hardcoded demo keys, now requires explicit environment setup
- **WebSocket security**: All WebSocket connections now require API key or JWT authentication
- **Error handling**: Improved JSON-RPC 2.0 compliant error responses

#### Removed
- **Hardcoded admin credentials**: Eliminated `admin/changeme` default credentials
- **Hardcoded API keys**: Removed `cnis-demo-key-12345` and `cnis-admin-key-67890` from source code
- **Weak JWT fallbacks**: Removed `fallback-secret-change-in-production` default secret

#### Fixed
- **TypeScript compilation**: Resolved all type safety issues and compilation errors
- **WebSocket interface compatibility**: Fixed handler signature mismatches
- **Input sanitization**: Enhanced XSS and injection protection
- **Runtime errors**: Fixed IPv6 rate limiting and tool execution timeouts

#### Security Impact
- **Critical vulnerabilities resolved**: 4 high-severity and 3 medium-severity issues fixed
- **Authentication bypass prevented**: No more default credentials or weak secrets
- **Unauthorized access blocked**: WebSocket endpoints now properly authenticated
- **Production-ready security**: Full environment-based configuration required

### 🛠️ Technical Improvements

#### Added
- **Linting compliance**: All TypeScript strict mode requirements met
- **Code quality**: Readonly modifiers, optional chaining, and clean error handling
- **Build optimization**: Clean compilation with zero warnings

#### Changed
- **Type safety**: Enhanced TypeScript interfaces for WebSocket connections
- **Error handling**: Improved async error handling and validation
- **Configuration**: Better environment variable management

### 📋 Requirements

#### New Environment Variables Required
```bash
# Authentication (Required for production)
JWT_SECRET=your-jwt-secret-min-32-characters
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_API_KEY=your-admin-api-key

# Optional development variables
DEMO_API_KEY=your-demo-key  # Only in development
NODE_ENV=production         # For production deployment
```

### 🔄 Migration Guide

#### From v1.0.0 to v1.1.0

1. **Update environment variables**:
   ```bash
   # Add to your .env file
   JWT_SECRET="generate-a-secure-32-plus-character-secret-here"
   ADMIN_USERNAME="your-chosen-admin-username"
   ADMIN_PASSWORD="your-secure-admin-password-here"
   ADMIN_API_KEY="your-generated-admin-api-key-here"
   ```

2. **Remove hardcoded credentials**:
   - No more `admin/changeme` login
   - No more `cnis-demo-key-12345` API key
   - Use environment variables only

3. **Update client authentication**:
   - WebSocket clients must provide authentication
   - Use `?token=JWT_TOKEN` or `?apiKey=API_KEY` in WebSocket URL
   - Or provide `Authorization: Bearer TOKEN` or `x-api-key: KEY` headers

4. **Verify deployment**:
   ```bash
   npm run build  # Should complete without errors
   npm test       # Should pass all security checks
   ```

## [1.0.0] - 2024-09-21

### 🎉 Initial Release

#### Added
- **Triple Protocol Support**: STDIO MCP, HTTP REST API, HTTP MCP Protocol, WebSocket MCP
- **Crypto News Intelligence**: AI-powered credibility scoring, impact analysis, sentiment analysis
- **Free Data Sources**: 11 trusted RSS feeds, no API keys required for basic functionality
- **MCP Standards Compliance**: Full JSON-RPC 2.0 support, proper error handling
- **n8n Integration**: Compatible with n8n-nodes-mcp for workflow automation
- **Claude Desktop Integration**: Direct STDIO MCP support for Claude Desktop
- **Real-time Streaming**: WebSocket support for live news updates
- **Docker Support**: Production-ready containerization
- **Comprehensive Testing**: Protocol validation and integration tests

#### Features
- **5 Core Tools**: Top crypto news, search, market impact analysis, credibility analysis, source filtering
- **Multi-source Aggregation**: CoinDesk, Cointelegraph, The Block, Bitcoin Magazine, and more
- **Intelligence Analysis**: Credibility scoring, market impact prediction, sentiment analysis
- **Cross-reference Verification**: News validation across multiple sources
- **Rate Limiting**: Configurable request limiting for production use
- **CORS Support**: Cross-origin request handling for web applications
- **Comprehensive Logging**: Request/response logging and error tracking

### 📊 Statistics
- **11 RSS Sources**: Tier 1 trusted, official, and analytics sources
- **5 Analysis Tools**: Complete crypto news intelligence suite
- **3+ Protocol Support**: Maximum compatibility and integration options
- **0 API Keys Required**: Free operation with RSS feeds only

---

## Legend

- 🔒 **Security**: Security-related changes
- 🛠️ **Technical**: Technical improvements and fixes
- 🎉 **Feature**: New features and capabilities
- 📋 **Requirements**: New requirements or dependencies
- 🔄 **Migration**: Breaking changes requiring migration
- 📊 **Statistics**: Project metrics and numbers