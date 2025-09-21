// REST API Protocol Handler - Standard HTTP endpoints for web applications
import { Request, Response, Router } from 'express';
import { RestApiHandler, RestRoute, ToolContext } from '../types/universal-types.js';
import { getUniversalTools } from '../tools/tool-registry.js';

export class RestApiProtocolHandler implements RestApiHandler {
  public name = 'rest-api' as const;
  public routes: RestRoute[] = [];
  private router: Router;

  constructor() {
    this.router = Router();
    
    // Add request timing middleware
    this.router.use((req: any, _res, next) => {
      req.startTime = Date.now();
      next();
    });
    
    this.setupRoutes();
  }

  async initialize(): Promise<void> {
    console.log('🌐 Initializing REST API Protocol...');
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up REST API Protocol...');
  }

  async handleRequest(_request: any): Promise<any> {
    throw new Error('REST API uses Express router for request handling');
  }

  // Setup REST API routes
  private setupRoutes(): void {
    // Health check endpoint
    this.router.get('/health', this.handleHealth.bind(this));
    
    // Status endpoint with detailed info
    this.router.get('/status', this.handleStatus.bind(this));
    
    // Metrics endpoint
    this.router.get('/metrics', this.handleMetrics.bind(this));
    
    // Tools discovery endpoints
    this.router.get('/tools', this.handleGetTools.bind(this));
    this.router.get('/tools/:toolName/schema', this.handleGetToolSchema.bind(this));
    
    // Tool execution endpoints
    this.router.post('/tools/:toolName', this.handleToolExecution.bind(this));
    
    // Batch tool execution
    this.router.post('/tools/batch', this.handleBatchExecution.bind(this));
    
    // API documentation endpoint
    this.router.get('/docs', this.handleApiDocs.bind(this));

    // Store route information for introspection
    this.routes = [
      { method: 'GET', path: '/health', handler: this.handleHealth.bind(this) },
      { method: 'GET', path: '/status', handler: this.handleStatus.bind(this) },
      { method: 'GET', path: '/metrics', handler: this.handleMetrics.bind(this) },
      { method: 'GET', path: '/tools', handler: this.handleGetTools.bind(this) },
      { method: 'GET', path: '/tools/:toolName/schema', handler: this.handleGetToolSchema.bind(this) },
      { method: 'POST', path: '/tools/:toolName', handler: this.handleToolExecution.bind(this) },
      { method: 'POST', path: '/tools/batch', handler: this.handleBatchExecution.bind(this) },
      { method: 'GET', path: '/docs', handler: this.handleApiDocs.bind(this) }
    ];
  }

  // Get Express router
  getRouter(): Router {
    return this.router;
  }

  // Health check endpoint
  private async handleHealth(_req: Request, res: Response): Promise<void> {
    const cacheStats = await this.getCacheStats();
    
    res.json({
      status: 'healthy',
      version: '2.0.0',
      mode: 'REST',
      protocol: 'rest-api',
      cache: cacheStats,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  // Detailed status endpoint
  private async handleStatus(_req: Request, res: Response): Promise<void> {
    try {
      const tools = await getUniversalTools();
      const cacheStats = await this.getCacheStats();
      
      res.json({
        server: {
          name: 'cnis-mcp-server',
          version: '2.0.0',
          mode: 'Universal MCP Server',
          uptime: process.uptime()
        },
        protocols: {
          stdio: true,
          'http-mcp': true,
          'websocket-mcp': true,
          'rest-api': true
        },
        tools: {
          count: tools.length,
          names: tools.map(t => t.name)
        },
        cache: cacheStats,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get server status',
        message: error.message
      });
    }
  }

  // Metrics endpoint
  private async handleMetrics(_req: Request, res: Response): Promise<void> {
    const memUsage = process.memoryUsage();
    
    res.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage()
      }
    });
  }

  // Get all available tools
  private async handleGetTools(_req: Request, res: Response): Promise<void> {
    try {
      const tools = await getUniversalTools();
      
      res.json({
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          permissions: tool.permissions,
          endpoints: {
            execute: `/api/tools/${tool.name}`,
            schema: `/api/tools/${tool.name}/schema`
          }
        })),
        count: tools.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get tools',
        message: error.message
      });
    }
  }

  // Get specific tool schema
  private async handleGetToolSchema(req: Request, res: Response): Promise<void> {
    try {
      const { toolName } = req.params;
      const tools = await getUniversalTools();
      const tool = tools.find(t => t.name === toolName);
      
      if (!tool) {
        res.status(404).json({
          error: 'Tool not found',
          toolName,
          availableTools: tools.map(t => t.name)
        });
        return;
      }

      res.json({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        permissions: tool.permissions,
        example: {
          url: `/api/tools/${tool.name}`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: this.generateExampleBody(tool.inputSchema)
        }
      });
    } catch (error: any) {
      res.status(500).json({
        error: 'Failed to get tool schema',
        message: error.message
      });
    }
  }

  // Execute single tool
  private async handleToolExecution(req: Request, res: Response): Promise<void> {
    try {
      const { toolName } = req.params;
      const params = req.body;
      
      const result = await this.handleToolRequest(toolName, params);
      
      res.json({
        tool: toolName,
        result,
        timestamp: new Date().toISOString(),
        executionTime: `${Date.now() - (req as any).startTime}ms`
      });
      
    } catch (error: any) {
      console.error(`❌ REST API Tool Error (${req.params.toolName}):`, error);
      
      const statusCode = error.message.includes('not found') ? 404 : 
                         error.message.includes('Invalid') ? 400 : 500;
      
      res.status(statusCode).json({
        error: 'Tool execution failed',
        tool: req.params.toolName,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Execute multiple tools in batch
  private async handleBatchExecution(req: Request, res: Response): Promise<void> {
    try {
      const { requests } = req.body;
      
      if (!Array.isArray(requests)) {
        res.status(400).json({
          error: 'Invalid batch request',
          message: 'requests must be an array'
        });
        return;
      }

      const results = await Promise.allSettled(
        requests.map(async (request: any) => {
          const { tool, params } = request;
          return {
            tool,
            result: await this.handleToolRequest(tool, params),
            status: 'fulfilled'
          };
        })
      );

      const response = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            tool: requests[index].tool,
            error: result.reason.message,
            status: 'rejected'
          };
        }
      });

      res.json({
        batch: response,
        summary: {
          total: requests.length,
          successful: response.filter(r => r.status === 'fulfilled').length,
          failed: response.filter(r => r.status === 'rejected').length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      res.status(500).json({
        error: 'Batch execution failed',
        message: error.message
      });
    }
  }

  // API documentation endpoint
  private async handleApiDocs(req: Request, res: Response): Promise<void> {
    const tools = await getUniversalTools();
    
    const documentation = {
      title: 'CNiS-MCP REST API Documentation',
      version: '2.0.0',
      description: 'Universal MCP Server REST API for crypto news intelligence',
      baseUrl: `${req.protocol}://${req.get('host')}/api`,
      endpoints: {
        health: {
          method: 'GET',
          path: '/health',
          description: 'Server health check'
        },
        status: {
          method: 'GET', 
          path: '/status',
          description: 'Detailed server status and configuration'
        },
        tools: {
          list: {
            method: 'GET',
            path: '/tools',
            description: 'List all available tools'
          },
          schema: {
            method: 'GET',
            path: '/tools/{toolName}/schema',
            description: 'Get tool schema and usage example'
          },
          execute: {
            method: 'POST',
            path: '/tools/{toolName}',
            description: 'Execute specific tool',
            body: 'Tool-specific parameters'
          },
          batch: {
            method: 'POST',
            path: '/tools/batch',
            description: 'Execute multiple tools',
            body: { requests: [{ tool: 'toolName', params: {} }] }
          }
        }
      },
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        endpoint: `/tools/${tool.name}`,
        schema: tool.inputSchema
      })),
      examples: {
        getNews: {
          url: '/api/tools/get_top_crypto_news',
          method: 'POST',
          body: { count: 10, filter_impact: 'high' }
        },
        searchNews: {
          url: '/api/tools/search_crypto_news', 
          method: 'POST',
          body: { query: 'bitcoin', count: 5 }
        }
      }
    };

    // Return HTML documentation or JSON based on Accept header
    if (req.accepts('html')) {
      res.send(this.generateHtmlDocs(documentation));
    } else {
      res.json(documentation);
    }
  }

  // Handle tool request (core logic)
  async handleToolRequest(toolName: string, params: any): Promise<any> {
    const tools = await getUniversalTools();
    const tool = tools.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Create tool context for REST API protocol
    const context: ToolContext = {
      protocol: 'rest-api',
      requestId: `rest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    return await tool.handler(params || {}, context);
  }

  // Helper methods
  private async getCacheStats() {
    // This would integrate with the news collector cache
    return {
      size: 0,
      lastUpdate: null,
      hitRate: 0
    };
  }

  private generateExampleBody(schema: any): any {
    const example: any = {};
    
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        const property = prop as any;
        switch (property.type) {
          case 'string':
            example[key] = property.default || 'example_string';
            break;
          case 'number':
            example[key] = property.default || 10;
            break;
          case 'boolean':
            example[key] = property.default || true;
            break;
          case 'array':
            example[key] = [];
            break;
          default:
            example[key] = property.default || null;
        }
      }
    }
    
    return example;
  }

  private generateHtmlDocs(docs: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${docs.title}</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .method { font-weight: bold; color: #007acc; }
            pre { background: #333; color: #fff; padding: 10px; border-radius: 3px; overflow-x: auto; }
            .tool { border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>${docs.title}</h1>
        <p>${docs.description}</p>
        <p><strong>Base URL:</strong> ${docs.baseUrl}</p>
        
        <h2>Endpoints</h2>
        ${Object.entries(docs.endpoints).map(([category, endpoints]: [string, any]) => 
          typeof endpoints === 'object' && endpoints.method ? 
            `<div class="endpoint">
                <span class="method">${endpoints.method}</span> ${endpoints.path}
                <p>${endpoints.description}</p>
            </div>` :
            `<h3>${category}</h3>
            ${Object.entries(endpoints).map(([, endpoint]: [string, any]) =>
              `<div class="endpoint">
                  <span class="method">${endpoint.method}</span> ${endpoint.path}
                  <p>${endpoint.description}</p>
              </div>`
            ).join('')}`
        ).join('')}
        
        <h2>Available Tools</h2>
        ${docs.tools.map((tool: any) => 
          `<div class="tool">
              <h4>${tool.name}</h4>
              <p>${tool.description}</p>
              <p><strong>Endpoint:</strong> POST ${tool.endpoint}</p>
          </div>`
        ).join('')}
    </body>
    </html>
    `;
  }
}