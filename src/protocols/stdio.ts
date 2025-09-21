// STDIO MCP Protocol Handler - Preserves existing Claude Desktop functionality
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { StdioHandler, ToolContext } from '../types/universal-types.js';
import { getUniversalTools } from '../tools/tool-registry.js';

export class StdioProtocolHandler implements StdioHandler {
  public name = 'stdio' as const;
  public server: Server;
  private transport?: StdioServerTransport;

  constructor() {
    this.server = new Server(
      {
        name: 'cnis-mcp-server',
        version: '2.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
  }

  async initialize(): Promise<void> {
    console.error('🚀 Initializing STDIO MCP Protocol...');
    
    // Handle EPIPE errors gracefully (when clients close pipes)
    process.stdout.on('error', (err: any) => {
      if (err.code === 'EPIPE') {
        // Client closed the pipe - this is normal, exit gracefully
        process.exit(0);
      } else {
        console.error('❌ STDOUT error:', err);
        process.exit(1);
      }
    });

    process.stderr.on('error', (err: any) => {
      if (err.code === 'EPIPE') {
        // Client closed the pipe - exit gracefully  
        process.exit(0);
      }
    });

    // Register tools list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('🔧 STDIO: Listing available tools');
      const tools = await getUniversalTools();
      return { 
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Register tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.error(`🔧 STDIO: Calling tool ${name}`);

      try {
        const tools = await getUniversalTools();
        const tool = tools.find(t => t.name === name);
        
        if (!tool) {
          throw new Error(`Unknown tool: ${name}`);
        }

        // Create tool context for STDIO protocol
        const context: ToolContext = {
          protocol: 'stdio',
          requestId: `stdio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };

        const result = await tool.handler(args, context);
        
        return {
          content: [{ type: 'text', text: result }]
        };

      } catch (error: any) {
        console.error(`❌ STDIO Error in ${name}:`, error.message);
        return {
          content: [{ 
            type: 'text', 
            text: `❌ Error: ${error.message}` 
          }],
          isError: true
        };
      }
    });

    // Connect STDIO transport
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    console.error('✅ STDIO MCP Protocol connected and ready');
  }

  async cleanup(): Promise<void> {
    console.error('🧹 Cleaning up STDIO Protocol...');
    if (this.transport) {
      // Graceful shutdown
      process.removeAllListeners('SIGINT');
      process.removeAllListeners('SIGTERM');
    }
  }

  async handleRequest(_request: any): Promise<any> {
    // Requests are handled through the MCP SDK server
    // This method is for interface compliance
    throw new Error('STDIO protocol uses MCP SDK transport, not direct request handling');
  }

  // Start STDIO server (for standalone STDIO mode)
  async start(): Promise<void> {
    console.error('🚀 Starting CNiS-MCP Server in STDIO mode...');
    
    await this.initialize();
    
    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.error(`📵 Received ${signal}, shutting down gracefully...`);
      await this.cleanup();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep the process running
    console.error('✅ CNiS-MCP Server connected via STDIO');
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }
}