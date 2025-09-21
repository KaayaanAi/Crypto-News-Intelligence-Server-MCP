// HTTP MCP Protocol Handler - n8n-nodes-mcp compatibility
import { Request, Response, Router } from 'express';
import { HttpMcpHandler, ToolContext } from '../types/universal-types.js';
import { getUniversalTools } from '../tools/tool-registry.js';

export class HttpMcpProtocolHandler implements HttpMcpHandler {
  public name = 'http-mcp' as const;
  public endpoint = '/mcp';
  private readonly router: Router;

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
    this.router.get('/health', async (_req: Request, res: Response) => {
      const health = await this.healthCheck();
      res.json(health);
    });
    
    // Protocol info endpoint
    this.router.get('/info', (_req: Request, res: Response) => {
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

        case 'resources/list':
          return this.handleResourcesList(id);

        case 'resources/read':
          return this.handleResourceRead(id, params);

        case 'prompts/list':
          return this.handlePromptsList(id);

        case 'prompts/get':
          return this.handlePromptGet(id, params);

        default:
          return this.createErrorResponse(id, -32601, 'Method not found', `Unknown method: ${method}`);
      }

    } catch (error: any) {
      console.error('❌ HTTP MCP Error:', error);
      return this.createErrorResponse(null, -32603, 'Internal error', error.message);
    }
  }

  // Initialize MCP session
  private async handleInitialize(id: any, _params: any): Promise<any> {
    console.log('🔧 HTTP MCP: Initialize request');
    
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {}
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
        requestId: `http-mcp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
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

  // List available resources
  private async handleResourcesList(id: any): Promise<any> {
    console.log('🔧 HTTP MCP: Resources list request');

    return {
      jsonrpc: '2.0',
      id,
      result: {
        resources: [
          {
            uri: 'crypto://news/latest',
            name: 'Latest Crypto News',
            description: 'Latest cryptocurrency news from all sources',
            mimeType: 'application/json'
          },
          {
            uri: 'crypto://news/high-impact',
            name: 'High Impact News',
            description: 'High-impact news that could affect markets',
            mimeType: 'application/json'
          },
          {
            uri: 'crypto://market/summary',
            name: 'Market Summary',
            description: 'Current market sentiment and intelligence summary',
            mimeType: 'application/json'
          }
        ]
      }
    };
  }

  // Read specific resource
  private async handleResourceRead(id: any, params: any): Promise<any> {
    try {
      const { uri } = params;
      console.log(`🔧 HTTP MCP: Resource read - ${uri}`);

      if (!uri) {
        return this.createErrorResponse(id, -32602, 'Invalid params', 'Resource URI is required');
      }

      let content: string;

      switch (uri) {
        case 'crypto://news/latest': {
          const tools = await getUniversalTools();
          const getTopNewsTool = tools.find(t => t.name === 'get_top_crypto_news');
          if (getTopNewsTool) {
            const context: ToolContext = { protocol: 'http-mcp', requestId: `resource-${Date.now()}` };
            content = await getTopNewsTool.handler({ count: 10 }, context);
          } else {
            content = 'Latest news tool not available';
          }
          break;
        }

        case 'crypto://news/high-impact': {
          const tools2 = await getUniversalTools();
          const impactTool = tools2.find(t => t.name === 'get_market_impact_news');
          if (impactTool) {
            const context: ToolContext = { protocol: 'http-mcp', requestId: `resource-${Date.now()}` };
            content = await impactTool.handler({ min_impact_score: 70 }, context);
          } else {
            content = 'High-impact news tool not available';
          }
          break;
        }

        case 'crypto://market/summary': {
          content = JSON.stringify({
            timestamp: new Date().toISOString(),
            status: 'active',
            message: 'Market summary available via get_top_crypto_news tool'
          }, null, 2);
          break;
        }

        default:
          return this.createErrorResponse(id, -32602, 'Invalid params', `Unknown resource URI: ${uri}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          contents: [{ type: 'text', text: content }]
        }
      };

    } catch (error: any) {
      return this.createErrorResponse(id, -32603, 'Internal error', `Resource read failed: ${error.message}`);
    }
  }

  // List available prompts
  private async handlePromptsList(id: any): Promise<any> {
    console.log('🔧 HTTP MCP: Prompts list request');

    return {
      jsonrpc: '2.0',
      id,
      result: {
        prompts: [
          {
            name: 'crypto_news_analysis',
            description: 'Analyze crypto news for market impact and credibility',
            arguments: [
              {
                name: 'news_text',
                description: 'The news article text to analyze',
                required: true
              },
              {
                name: 'include_sentiment',
                description: 'Include sentiment analysis',
                required: false
              }
            ]
          },
          {
            name: 'market_summary_prompt',
            description: 'Generate a comprehensive market summary from news data',
            arguments: [
              {
                name: 'time_range',
                description: 'Time range for news analysis (e.g., "24h", "7d")',
                required: false
              }
            ]
          }
        ]
      }
    };
  }

  // Get specific prompt
  private async handlePromptGet(id: any, params: any): Promise<any> {
    try {
      const { name, arguments: args } = params;
      console.log(`🔧 HTTP MCP: Prompt get - ${name}`);

      if (!name) {
        return this.createErrorResponse(id, -32602, 'Invalid params', 'Prompt name is required');
      }

      let prompt: string;

      switch (name) {
        case 'crypto_news_analysis': {
          const newsText = args?.news_text || '[News article text here]';
          const includeSentiment = args?.include_sentiment !== false;

          prompt = `Analyze the following cryptocurrency news article for:

1. **Credibility Assessment** (0-100):
   - Source reliability
   - Fact verification
   - Cross-reference validation

2. **Market Impact Analysis** (0-100):
   - Potential price movement
   - Affected cryptocurrencies
   - Timeline of impact

${includeSentiment ? `3. **Sentiment Analysis**:
   - Overall sentiment (positive/negative/neutral)
   - Market emotion indicators
   - Community reaction potential

` : ''}**News Article:**
${newsText}

**Provide analysis in structured format with specific scores and actionable insights.**`;
          break;
        }

        case 'market_summary_prompt': {
          const timeRange = args?.time_range || '24h';

          prompt = `Generate a comprehensive cryptocurrency market summary for the last ${timeRange} based on:

1. **Key News Events**: Most important developments
2. **Market Sentiment**: Overall market mood and direction
3. **Regulatory Updates**: Any regulatory changes or announcements
4. **Technical Developments**: Protocol updates, partnerships, launches
5. **Risk Assessment**: Current market risks and opportunities

**Format the summary for:**
- Executive overview (2-3 sentences)
- Key highlights (bullet points)
- Market outlook (bullish/bearish/neutral with reasoning)
- Recommended actions for traders/investors

**Time Range:** ${timeRange}
**Analysis Date:** ${new Date().toISOString()}`;
          break;
        }

        default:
          return this.createErrorResponse(id, -32602, 'Invalid params', `Unknown prompt: ${name}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          description: `Generated prompt for ${name}`,
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: prompt }
            }
          ]
        }
      };

    } catch (error: any) {
      return this.createErrorResponse(id, -32603, 'Internal error', `Prompt generation failed: ${error.message}`);
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
      methods: ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read', 'prompts/list', 'prompts/get'],
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