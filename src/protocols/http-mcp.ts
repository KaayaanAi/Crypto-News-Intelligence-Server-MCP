// HTTP MCP Protocol Handler - n8n-nodes-mcp compatibility
import { Request, Response, Router } from 'express';
import { HttpMcpHandler, ToolContext } from '../types/universal-types.js';
import { getUniversalTools } from '../tools/tool-registry.js';

export class HttpMcpProtocolHandler implements HttpMcpHandler {
  public name = 'http-mcp' as const;
  public endpoint = '/mcp';
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  async initialize(): Promise<void> {
    console.log('🌐 Initializing HTTP MCP Protocol...');
  }

  // Get Express router
  getRouter(): Router {
    return this.router;
  }

  // Setup MCP routes
  private setupRoutes(): void {
    // Handle all MCP requests via POST
    this.router.post('/', this.handleHttpRequest.bind(this));
    
    // Health check endpoint
    this.router.get('/health', async (req: Request, res: Response) => {
      const health = await this.healthCheck();
      res.json(health);
    });
    
    // Protocol info endpoint
    this.router.get('/info', (req: Request, res: Response) => {
      res.json(this.getProtocolInfo());
    });
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up HTTP MCP Protocol...');
  }

  async handleRequest(request: any): Promise<any> {
    return this.handleJsonRpc(request);
  }

  // Main JSON-RPC 2.0 handler for MCP protocol
  async handleJsonRpc(rpcRequest: any): Promise<any> {
    try {
      const { jsonrpc, id, method, params } = rpcRequest;

      // Validate JSON-RPC 2.0 format
      if (jsonrpc !== '2.0') {
        return this.createErrorResponse(id, -32600, 'Invalid Request', 'JSON-RPC version must be 2.0');
      }

      if (!method) {
        return this.createErrorResponse(id, -32600, 'Invalid Request', 'Method is required');
      }

      // Handle MCP methods
      switch (method) {
        case 'initialize':
          return this.handleInitialize(id, params);
        
        case 'tools/list':
          return this.handleToolsList(id);
        
        case 'tools/call':
          return this.handleToolCall(id, params);
        
        default:
          return this.createErrorResponse(id, -32601, 'Method not found', `Unknown method: ${method}`);
      }

    } catch (error: any) {
      console.error('❌ HTTP MCP Error:', error);
      return this.createErrorResponse(null, -32603, 'Internal error', error.message);
    }
  }

  // Initialize MCP session
  private async handleInitialize(id: any, params: any): Promise<any> {
    console.log('🔧 HTTP MCP: Initialize request');
    
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'cnis-mcp-server',
          version: '2.0.0'
        }
      }
    };
  }

  // List available tools
  private async handleToolsList(id: any): Promise<any> {
    console.log('🔧 HTTP MCP: Tools list request');
    
    try {
      const tools = await getUniversalTools();
      
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }))
        }
      };
    } catch (error: any) {
      return this.createErrorResponse(id, -32603, 'Internal error', `Failed to list tools: ${error.message}`);
    }
  }

  // Execute tool
  private async handleToolCall(id: any, params: any): Promise<any> {
    try {
      const { name, arguments: args } = params;
      console.log(`🔧 HTTP MCP: Tool call - ${name}`);

      if (!name) {
        return this.createErrorResponse(id, -32602, 'Invalid params', 'Tool name is required');
      }

      const tools = await getUniversalTools();
      const tool = tools.find(t => t.name === name);
      
      if (!tool) {
        return this.createErrorResponse(id, -32602, 'Invalid params', `Unknown tool: ${name}`);
      }

      // Create tool context for HTTP MCP protocol
      const context: ToolContext = {
        protocol: 'http-mcp',
        requestId: `http-mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const result = await tool.handler(args || {}, context);
      
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: result }]
        }
      };

    } catch (error: any) {
      console.error(`❌ HTTP MCP Tool Error:`, error);
      return this.createErrorResponse(id, -32603, 'Internal error', `Tool execution failed: ${error.message}`);
    }
  }

  // Express.js route handler
  async handleHttpRequest(req: Request, res: Response): Promise<void> {
    try {
      // Handle single request
      if (req.body && !Array.isArray(req.body)) {
        const response = await this.handleJsonRpc(req.body);
        res.json(response);
        return;
      }

      // Handle batch requests
      if (Array.isArray(req.body)) {
        const responses = await Promise.all(
          req.body.map(request => this.handleJsonRpc(request))
        );
        res.json(responses);
        return;
      }

      // Invalid request
      res.status(400).json(
        this.createErrorResponse(null, -32600, 'Invalid Request', 'Request body is required')
      );

    } catch (error: any) {
      console.error('❌ HTTP MCP Handler Error:', error);
      res.status(500).json(
        this.createErrorResponse(null, -32603, 'Internal error', error.message)
      );
    }
  }

  // Create JSON-RPC 2.0 error response
  private createErrorResponse(id: any, code: number, message: string, data?: any): any {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        ...(data && { data })
      }
    };
  }

  // Health check for HTTP MCP
  async healthCheck(): Promise<{ status: string; protocol: string; endpoints: string[] }> {
    return {
      status: 'healthy',
      protocol: 'http-mcp',
      endpoints: [this.endpoint]
    };
  }

  // Get protocol info for n8n integration
  getProtocolInfo() {
    return {
      name: 'HTTP MCP Protocol',
      version: '2024-11-05',
      endpoint: this.endpoint,
      methods: ['initialize', 'tools/list', 'tools/call'],
      description: 'JSON-RPC 2.0 over HTTP for n8n-nodes-mcp compatibility',
      example: {
        url: `http://localhost:3000${this.endpoint}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        }
      }
    };
  }
}