#!/usr/bin/env node
// Universal MCP Server Entry Point - Supports STDIO, HTTP REST, HTTP MCP, WebSocket MCP
import { UniversalMcpServer } from './http-server.js';
import { getValidatedConfig, getDevelopmentConfig, getProductionConfig } from './config/universal-config.js';

// Parse command line arguments and environment variables
const args = process.argv.slice(2);
const mode = args.find(arg => ['stdio', 'http', 'full'].includes(arg)) as 'stdio' | 'http' | 'full' | undefined;
const envMode = process.env.MCP_MODE as 'stdio' | 'http' | 'full' | undefined;
const serverMode = mode || envMode || 'stdio';

// Determine configuration based on environment
function getServerConfig() {
  const nodeEnv = process.env.NODE_ENV;
  
  switch (nodeEnv) {
    case 'production':
      return getProductionConfig();
    case 'development':
      return getDevelopmentConfig();
    default:
      return getValidatedConfig();
  }
}

// Main server startup function
async function startServer() {
  try {
    console.log('🌟 CNiS Universal MCP Server v2.0.0');
    console.log(`📋 Mode: ${serverMode.toUpperCase()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Get configuration
    const config = getServerConfig();
    
    // Display enabled protocols
    console.log('🔌 Enabled Protocols:');
    if (config.protocols.stdio) console.log('   💻 STDIO MCP (Claude Desktop)');
    if (config.protocols.rest) console.log('   🌐 HTTP REST API (Web Applications)');
    if (config.protocols.http) console.log('   🔗 HTTP MCP Protocol (n8n-nodes-mcp)');
    if (config.protocols.websocket) console.log('   🌊 WebSocket MCP (Real-time Streaming)');
    
    // Create and start server
    const server = new UniversalMcpServer(config);
    
    // Setup graceful shutdown
    setupGracefulShutdown(server);
    
    // Start server in specified mode
    await server.start(serverMode);
    
    console.log(`✅ Universal MCP Server started successfully`);
    
    // Keep process alive for STDIO mode
    if (serverMode === 'stdio') {
      console.log('📡 STDIO MCP Server ready for Claude Desktop connection');
      
      // Handle process signals gracefully
      process.stdin.resume();
      
      // Handle EPIPE errors gracefully (when Claude Desktop closes the connection)
      process.stdout.on('error', (err) => {
        if (err.code === 'EPIPE') {
          // Client closed the pipe - this is normal, exit gracefully
          console.error('📡 Claude Desktop disconnected');
          process.exit(0);
        } else {
          console.error('❌ STDOUT error:', err);
          process.exit(1);
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ Failed to start Universal MCP Server:', error);
    
    // Handle EPIPE errors gracefully
    if (error.code === 'EPIPE' || error.errno === -32) {
      console.error('📡 Client connection closed');
      process.exit(0);
    } else {
      console.error('💥 Server startup failed:', error.message);
      process.exit(1);
    }
  }
}

// Setup graceful shutdown handlers
function setupGracefulShutdown(server: UniversalMcpServer) {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGUSR2'];
  
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      try {
        await server.shutdown();
        console.log('✅ Server shutdown complete');
        process.exit(0);
      } catch (error: any) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception:', error);
    
    try {
      await server.shutdown();
    } catch (shutdownError: any) {
      console.error('❌ Error during emergency shutdown:', shutdownError.message);
    }
    
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    
    try {
      await server.shutdown();
    } catch (shutdownError: any) {
      console.error('❌ Error during emergency shutdown:', shutdownError.message);
    }
    
    process.exit(1);
  });
}

// Display help information
function displayHelp() {
  console.log(`
🌟 CNiS Universal MCP Server v2.0.0
Crypto News Intelligence Server with Multi-Protocol Support

USAGE:
  node build/index.js [mode]

MODES:
  stdio    - STDIO MCP Protocol only (Claude Desktop)
  http     - HTTP protocols only (REST + MCP + WebSocket)  
  full     - All protocols enabled (development/testing)

ENVIRONMENT VARIABLES:
  MCP_MODE            - Set server mode (stdio|http|full)
  NODE_ENV            - Environment (development|production|test)
  PORT                - HTTP server port (default: 3000)
  HOST                - HTTP server host (default: 0.0.0.0)
  
  AUTH_ENABLED        - Enable authentication (default: true)
  JWT_SECRET          - JWT secret for authentication
  
  RATE_LIMIT_ENABLED  - Enable rate limiting (default: true)
  RATE_LIMIT_MAX      - Max requests per window (default: 100)
  
  OPENAI_API_KEY      - OpenAI API key for analysis
  ANTHROPIC_API_KEY   - Anthropic API key for analysis
  GOOGLE_API_KEY      - Google Gemini API key for analysis
  
PROTOCOLS:
  📡 STDIO MCP          - Direct connection to Claude Desktop
  🌐 HTTP REST API      - Standard REST endpoints at /api
  🔗 HTTP MCP Protocol  - JSON-RPC 2.0 MCP at /mcp
  🌊 WebSocket MCP      - Real-time streaming at /mcp/ws

EXAMPLES:
  # STDIO mode for Claude Desktop
  node build/index.js stdio
  
  # HTTP mode for web applications
  MCP_MODE=http node build/index.js
  
  # Full mode with all protocols
  NODE_ENV=development node build/index.js full
  
  # Production mode
  NODE_ENV=production MCP_MODE=http node build/index.js

ENDPOINTS (HTTP mode):
  GET  /                    - Server information
  GET  /health              - Health check
  GET  /api/docs            - API documentation
  POST /auth/login          - Authentication
  GET  /api/tools           - List available tools
  POST /api/tools/{name}    - Execute tool
  POST /mcp                 - MCP JSON-RPC endpoint
  WS   /mcp/ws              - WebSocket MCP connection

For more information, visit: https://github.com/anthropics/claude-code
  `);
}

// CLI argument parsing
if (args.includes('--help') || args.includes('-h')) {
  displayHelp();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  console.log('2.0.0');
  process.exit(0);
}

// Start the server
startServer().catch(error => {
  console.error('💥 Fatal error during server startup:', error);
  process.exit(1);
});