// Universal MCP HTTP Server - Quad Protocol Orchestrator
// Supports: STDIO MCP, HTTP REST API, HTTP MCP Protocol, WebSocket MCP Protocol
import express, { Express } from 'express';
import { createServer, Server as HttpServer } from 'http';
import { UniversalServerConfig, ProtocolHandler } from './types/universal-types.js';
import { StdioProtocolHandler } from './protocols/stdio.js';
import { HttpMcpProtocolHandler } from './protocols/http-mcp.js';
import { WebSocketMcpProtocolHandler } from './protocols/websocket-mcp.js';
import { RestApiProtocolHandler } from './protocols/rest-api.js';
import { AuthMiddleware } from './middleware/auth.js';
import { RateLimitMiddleware } from './middleware/rate-limit.js';
import { SecurityMiddleware } from './middleware/security.js';
import { getUniversalConfig } from './config/universal-config.js';

export class UniversalMcpServer {
  private readonly config: UniversalServerConfig;
  private readonly app: Express;
  private readonly httpServer: HttpServer;
  private readonly protocols: Map<string, ProtocolHandler> = new Map();

  // Middleware instances
  private readonly authMiddleware: AuthMiddleware;
  private readonly rateLimitMiddleware: RateLimitMiddleware;
  private readonly securityMiddleware: SecurityMiddleware;

  // Protocol handlers
  private readonly stdioHandler: StdioProtocolHandler;
  private readonly httpMcpHandler: HttpMcpProtocolHandler;
  private readonly websocketHandler: WebSocketMcpProtocolHandler;
  private readonly restApiHandler: RestApiProtocolHandler;

  constructor(config?: UniversalServerConfig) {
    this.config = config || getUniversalConfig();
    this.app = express();
    this.httpServer = createServer(this.app);
    
    // Initialize middleware
    this.authMiddleware = new AuthMiddleware(this.config);
    this.rateLimitMiddleware = new RateLimitMiddleware(this.config);
    this.securityMiddleware = new SecurityMiddleware(this.config);
    
    // Initialize protocol handlers
    this.stdioHandler = new StdioProtocolHandler();
    this.httpMcpHandler = new HttpMcpProtocolHandler();
    this.websocketHandler = new WebSocketMcpProtocolHandler();
    this.restApiHandler = new RestApiProtocolHandler();
    
    this.setupMiddleware();
    this.setupProtocols();
  }

  // Setup Express middleware stack
  private setupMiddleware(): void {
    console.log('🛡️ Setting up middleware stack...');
    
    // Trust proxy for rate limiting and security
    this.app.set('trust proxy', 1);
    
    // Security middleware (must be first)
    this.app.use(this.securityMiddleware.getHelmetMiddleware());
    this.app.use(this.securityMiddleware.getCorsMiddleware());
    this.app.use(this.securityMiddleware.getCompressionMiddleware());
    this.app.use(this.securityMiddleware.healthCheckBypass());
    this.app.use(this.securityMiddleware.sanitizeRequest());
    
    // Parse JSON (before validation so req.body exists)
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Validate request after parsing JSON
    this.app.use(this.securityMiddleware.validateRequest());
    
    // Rate limiting middleware
    this.app.use(this.rateLimitMiddleware.getGlobalRateLimit());
    this.app.use('/api', this.rateLimitMiddleware.getApiRateLimit());
    this.app.use('/mcp', this.rateLimitMiddleware.getProtocolRateLimit('http-mcp'));
    
    // Authentication middleware (optional for public endpoints)  
    this.app.use(this.authMiddleware.optionalAuth() as any);
    
    // API security headers
    this.app.use('/api', this.securityMiddleware.apiSecurityHeaders());
    this.app.use('/mcp', this.securityMiddleware.apiSecurityHeaders());
    
    // Request timeout
    this.app.use(this.securityMiddleware.timeout(30000));
    
    console.log('✅ Middleware stack configured');
  }

  // Setup all protocol handlers
  private setupProtocols(): void {
    console.log('🔌 Setting up protocol handlers...');
    
    // 1. REST API Protocol (Public HTTP endpoints)
    if (this.config.protocols.rest) {
      this.app.use('/api', this.restApiHandler.getRouter());
      this.protocols.set('rest-api', this.restApiHandler);
      console.log('✅ REST API Protocol configured at /api');
    }
    
    // 2. HTTP MCP Protocol (JSON-RPC 2.0 for n8n-nodes-mcp)  
    if (this.config.protocols.http) {
      // Apply authentication for MCP endpoints
      this.app.use('/mcp', this.authMiddleware.requireAuth() as any);
      this.app.use('/mcp', this.httpMcpHandler.getRouter());
      this.protocols.set('http-mcp', this.httpMcpHandler);
      console.log('✅ HTTP MCP Protocol configured at /mcp');
    }
    
    // 3. WebSocket MCP Protocol (Real-time streaming)
    if (this.config.protocols.websocket) {
      this.websocketHandler.attachToHttpServer(this.httpServer);
      this.protocols.set('websocket-mcp', this.websocketHandler);
      console.log('✅ WebSocket MCP Protocol configured at /mcp/ws');
    }
    
    // 4. STDIO Protocol (Claude Desktop - handled separately)
    if (this.config.protocols.stdio) {
      this.protocols.set('stdio', this.stdioHandler);
      console.log('✅ STDIO Protocol handler registered');
    }
    
    // Root endpoint - server information
    this.app.get('/', this.handleRoot.bind(this));
    
    // Health check endpoints
    this.app.get('/health', this.handleHealthCheck.bind(this));
    this.app.get('/api/health', this.handleHealthCheck.bind(this));
    
    // Authentication endpoints
    this.app.post('/auth/login', this.authMiddleware.login() as any);
    this.app.get('/auth/info', this.authMiddleware.getAuthInfo() as any);
    
    // Admin endpoints (require admin permission)
    this.app.get('/admin/stats', 
      this.authMiddleware.requireAdmin() as any, 
      this.handleAdminStats.bind(this)
    );
    
    // Error handling (must be last)
    this.app.use(this.securityMiddleware.errorHandler());
    
    console.log('✅ All protocol handlers configured');
  }

  // Root endpoint - Universal MCP Server info
  private handleRoot(_req: express.Request, res: express.Response): void {
    res.json({
      name: 'CNiS Universal MCP Server',
      version: '2.0.0',
      description: 'Crypto News Intelligence Server with Universal MCP Protocol Support',
      protocols: {
        'stdio-mcp': {
          enabled: this.config.protocols.stdio,
          description: 'STDIO MCP Protocol for Claude Desktop',
          usage: 'Run with: node build/index.js (STDIO mode)'
        },
        'http-rest': {
          enabled: this.config.protocols.rest,
          endpoint: '/api',
          description: 'REST API for web applications',
          documentation: '/api/docs'
        },
        'http-mcp': {
          enabled: this.config.protocols.http,
          endpoint: '/mcp',
          description: 'JSON-RPC 2.0 MCP Protocol for n8n-nodes-mcp',
          authentication: 'required'
        },
        'websocket-mcp': {
          enabled: this.config.protocols.websocket,
          endpoint: '/mcp/ws',
          description: 'WebSocket MCP Protocol for real-time streaming',
          authentication: 'required'
        }
      },
      features: [
        'Multi-protocol MCP server',
        'Real-time crypto news intelligence',
        'Advanced authentication & authorization',
        'Rate limiting & security',
        'Tool-based architecture',
        'WebSocket streaming support'
      ],
      endpoints: {
        health: '/health',
        documentation: '/api/docs',
        authentication: '/auth/login',
        tools: '/api/tools'
      },
      timestamp: new Date().toISOString()
    });
  }

  // Health check endpoint
  private async handleHealthCheck(_req: express.Request, res: express.Response): Promise<void> {
    try {
      const authStats = this.authMiddleware.getStats();
      const rateLimitStats = this.rateLimitMiddleware.getStats();
      
      const health = {
        status: 'healthy',
        version: '2.0.0',
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        protocols: {
          stdio: this.config.protocols.stdio,
          httpRest: this.config.protocols.rest,
          httpMcp: this.config.protocols.http,
          websocketMcp: this.config.protocols.websocket
        },
        auth: authStats,
        rateLimit: rateLimitStats,
        timestamp: new Date().toISOString()
      };
      
      res.json(health);
    } catch (error: any) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Admin statistics endpoint
  private async handleAdminStats(_req: express.Request, res: express.Response): Promise<void> {
    try {
      const stats = {
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          version: process.version
        },
        protocols: {
          enabled: Array.from(this.protocols.keys()),
          count: this.protocols.size,
          details: Object.fromEntries(
            Array.from(this.protocols.entries()).map(([name, handler]) => [
              name, 
              { name: handler.name, status: 'active' }
            ])
          )
        },
        auth: this.authMiddleware.getStats(),
        rateLimit: this.rateLimitMiddleware.getStats(),
        connections: {
          websocket: this.websocketHandler.connections.size,
          active: this.protocols.size
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get admin stats',
        message: error.message
      });
    }
  }

  // Start HTTP server (for HTTP REST, HTTP MCP, WebSocket MCP)
  async startHttpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const port = this.config.server.port;
      const host = this.config.server.host;
      
      this.httpServer.listen(port, host, () => {
        console.log(`🚀 Universal MCP Server started on http://${host}:${port}`);
        console.log(`📋 Protocols enabled:`);
        
        if (this.config.protocols.rest) {
          console.log(`   📁 REST API: http://${host}:${port}/api`);
        }
        if (this.config.protocols.http) {
          console.log(`   🔌 HTTP MCP: http://${host}:${port}/mcp`);
        }
        if (this.config.protocols.websocket) {
          console.log(`   🌊 WebSocket MCP: ws://${host}:${port}/mcp/ws`);
        }
        if (this.config.protocols.stdio) {
          console.log(`   💻 STDIO MCP: Available for Claude Desktop`);
        }
        
        console.log(`📚 Documentation: http://${host}:${port}/api/docs`);
        console.log(`❤️ Health Check: http://${host}:${port}/health`);
        
        resolve();
      });
      
      this.httpServer.on('error', (error: any) => {
        console.error('❌ HTTP Server Error:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  // Start STDIO server (for Claude Desktop)
  async startStdioServer(): Promise<void> {
    if (!this.config.protocols.stdio) {
      throw new Error('STDIO protocol is not enabled');
    }
    
    console.log('💻 Starting STDIO MCP Server for Claude Desktop...');
    await this.stdioHandler.initialize();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });
    
    // Keep the process alive for STDIO
    console.log('✅ STDIO MCP Server ready for Claude Desktop');
  }

  // Start appropriate server based on mode
  async start(mode?: 'stdio' | 'http' | 'full'): Promise<void> {
    const serverMode = mode || process.env.MCP_MODE || 'full';
    
    console.log(`🌟 Starting Universal MCP Server in ${serverMode} mode...`);
    
    // Initialize all protocol handlers
    await this.initializeProtocols();
    
    switch (serverMode) {
      case 'stdio':
        // STDIO only (Claude Desktop)
        await this.startStdioServer();
        break;
        
      case 'http':
        // HTTP protocols only (REST, MCP, WebSocket)
        await this.startHttpServer();
        break;
        
      case 'full':
      default:
        // All protocols (for development/testing)
        await this.startHttpServer();
        if (this.config.protocols.stdio) {
          console.log('💻 STDIO MCP Protocol ready for Claude Desktop connection');
        }
        break;
    }
  }

  // Initialize all enabled protocol handlers
  private async initializeProtocols(): Promise<void> {
    console.log('🔧 Initializing protocol handlers...');
    
    const initPromises: Promise<void>[] = [];
    
    for (const [name, handler] of this.protocols) {
      initPromises.push(handler.initialize().catch(error => {
        console.error(`❌ Failed to initialize ${name} protocol:`, error);
        throw error;
      }));
    }
    
    await Promise.all(initPromises);
    console.log('✅ All protocol handlers initialized');
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Universal MCP Server...');
    
    // Close HTTP server
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => resolve());
      });
    }
    
    // Cleanup all protocol handlers
    const cleanupPromises: Promise<void>[] = [];
    for (const [name, handler] of this.protocols) {
      cleanupPromises.push(handler.cleanup().catch(error => {
        console.error(`❌ Failed to cleanup ${name} protocol:`, error);
      }));
    }
    
    await Promise.all(cleanupPromises);
    
    // Cleanup middleware
    this.rateLimitMiddleware.cleanup();
    
    console.log('✅ Universal MCP Server shutdown complete');
  }

  // Get server information
  getInfo() {
    return {
      name: 'CNiS Universal MCP Server',
      version: '2.0.0',
      protocols: Array.from(this.protocols.keys()),
      config: this.config
    };
  }

  // Get specific protocol handler
  getProtocol(name: string): ProtocolHandler | undefined {
    return this.protocols.get(name);
  }

  // Get all protocol handlers
  getProtocols(): Map<string, ProtocolHandler> {
    return this.protocols;
  }
}

// Export for direct usage
export { UniversalMcpServer as default };

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new UniversalMcpServer();
  server.start().catch(error => {
    console.error('❌ Failed to start Universal MCP Server:', error);
    process.exit(1);
  });
}