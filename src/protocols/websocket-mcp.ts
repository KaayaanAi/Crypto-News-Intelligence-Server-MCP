// WebSocket MCP Protocol Handler - Real-time streaming support
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketMcpHandler, WebSocketConnection, WebSocketMessage, ToolContext } from '../types/universal-types.js';
import { getUniversalTools } from '../tools/tool-registry.js';
import { AuthMiddleware } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import { parse as parseUrl } from 'url';

export class WebSocketMcpProtocolHandler implements WebSocketMcpHandler {
  public name = 'websocket-mcp' as const;
  public connections: Map<string, WebSocketConnection> = new Map();
  private wss?: WebSocketServer;
  private pingInterval?: NodeJS.Timeout;
  private authMiddleware?: AuthMiddleware;

  async initialize(): Promise<void> {
    console.log('⚡ Initializing WebSocket MCP Protocol...');

    // Start ping-pong heartbeat
    this.startHeartbeat();
  }

  // Set authentication middleware
  setAuthMiddleware(authMiddleware: AuthMiddleware): void {
    this.authMiddleware = authMiddleware;
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up WebSocket MCP Protocol...');
    
    // Clear heartbeat
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Close all connections
    for (const [, connection] of this.connections) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, 'Server shutdown');
      }
    }
    
    this.connections.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
  }

  async handleRequest(_request: any): Promise<any> {
    // WebSocket requests are handled through message handlers
    throw new Error('WebSocket protocol uses message-based communication');
  }

  // Attach WebSocket server to HTTP server
  attachToHttpServer(server: any): void {
    this.wss = new WebSocketServer({ 
      server,
      path: '/mcp/ws',
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    console.log('⚡ WebSocket MCP server attached to HTTP server at /mcp/ws');
  }

  // Handle new WebSocket connection
  handleConnection(ws: WebSocket, request: any): void {
    const connectionId = uuidv4();

    // Authentication check
    if (!this.authenticateConnection(ws, request)) {
      ws.close(1008, 'Authentication required');
      return;
    }

    const connection: WebSocketConnection = {
      id: connectionId,
      ws,
      isAlive: true,
      subscriptions: [],
      authenticated: true,
      permissions: this.getConnectionPermissions(request)
    };

    this.connections.set(connectionId, connection);
    console.log(`⚡ New authenticated WebSocket connection: ${connectionId}`);

    // Connection event handlers
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(connection, message);
      } catch (error: any) {
        console.error('❌ WebSocket message parse error:', error);
        this.sendError(connection, 'Invalid JSON message', -32700);
      }
    });

    ws.on('close', (code: number, reason: Buffer) => {
      console.log(`📴 WebSocket connection closed: ${connectionId} (${code}: ${reason.toString()})`);
      this.connections.delete(connectionId);
    });

    ws.on('error', (error: Error) => {
      console.error(`❌ WebSocket error for ${connectionId}:`, error);
      this.connections.delete(connectionId);
    });

    // Handle pong responses
    ws.on('pong', () => {
      connection.isAlive = true;
    });

    // Send welcome message
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'broadcast',
      data: {
        type: 'welcome',
        connectionId,
        serverInfo: {
          name: 'cnis-mcp-server',
          version: '2.0.0',
          protocols: ['websocket-mcp'],
          features: ['real-time-updates', 'streaming-analysis']
        }
      },
      timestamp: new Date()
    });
  }

  // Handle incoming WebSocket messages
  async handleMessage(connection: WebSocketConnection, message: any): Promise<void> {
    try {
      const { id, type, method, params } = message;

      switch (type) {
        case 'mcp-request':
          await this.handleMcpRequest(connection, { id, method, params });
          break;

        case 'ping':
          this.sendMessage(connection, {
            id: uuidv4(),
            type: 'pong',
            data: { originalId: id },
            timestamp: new Date()
          });
          break;

        case 'subscribe':
          this.handleSubscribe(connection, params);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(connection, params);
          break;

        default:
          this.sendError(connection, `Unknown message type: ${type}`, -32601, id);
      }

    } catch (error: any) {
      console.error('❌ WebSocket message handling error:', error);
      this.sendError(connection, 'Internal server error', -32603, message.id);
    }
  }

  // Handle MCP requests over WebSocket
  private async handleMcpRequest(connection: WebSocketConnection, request: any): Promise<void> {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          this.sendMcpResponse(connection, id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              realTime: true,
              streaming: true
            },
            serverInfo: {
              name: 'cnis-mcp-server',
              version: '2.0.0'
            }
          });
          break;

        case 'tools/list':
          const tools = await getUniversalTools();
          this.sendMcpResponse(connection, id, {
            tools: tools.map(tool => ({
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema,
              streaming: true // WebSocket supports streaming
            }))
          });
          break;

        case 'tools/call':
          await this.handleToolCall(connection, id, params);
          break;

        case 'tools/stream':
          await this.handleStreamingToolCall(connection, id, params);
          break;

        default:
          this.sendError(connection, `Unknown method: ${method}`, -32601, id);
      }

    } catch (error: any) {
      console.error(`❌ WebSocket MCP request error:`, error);
      this.sendError(connection, `Request failed: ${error.message}`, -32603, id);
    }
  }

  // Handle tool calls
  private async handleToolCall(connection: WebSocketConnection, id: any, params: any): Promise<void> {
    const { name, arguments: args } = params;

    if (!name) {
      this.sendError(connection, 'Tool name is required', -32602, id);
      return;
    }

    const tools = await getUniversalTools();
    const tool = tools.find(t => t.name === name);
    
    if (!tool) {
      this.sendError(connection, `Unknown tool: ${name}`, -32602, id);
      return;
    }

    // Create tool context for WebSocket protocol
    const context: ToolContext = {
      protocol: 'websocket-mcp',
      requestId: id,
      connectionId: connection.id
    };

    try {
      const result = await tool.handler(args || {}, context);
      
      this.sendMcpResponse(connection, id, {
        content: [{ type: 'text', text: result }]
      });

    } catch (error: any) {
      this.sendError(connection, `Tool execution failed: ${error.message}`, -32603, id);
    }
  }

  // Handle streaming tool calls (for long-running operations)
  private async handleStreamingToolCall(connection: WebSocketConnection, id: any, params: any): Promise<void> {
    const { name } = params;

    // Send initial response
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'mcp-response',
      data: {
        id,
        result: {
          streaming: true,
          status: 'started'
        }
      },
      timestamp: new Date()
    });

    // For crypto news tools, we can stream analysis progress
    if (name === 'get_top_crypto_news') {
      // Simulate streaming analysis
      for (let i = 1; i <= 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.sendMessage(connection, {
          id: uuidv4(),
          type: 'mcp-response',
          data: {
            id,
            streaming: {
              progress: i * 20,
              stage: `Processing stage ${i}/5`,
              partial: i < 5 ? `Intermediate result ${i}` : null
            }
          },
          timestamp: new Date()
        });
      }

      // Send final result
      await this.handleToolCall(connection, id, params);
    }
  }

  // Handle subscriptions
  private handleSubscribe(connection: WebSocketConnection, params: any): void {
    const { topics } = params;
    
    if (Array.isArray(topics)) {
      connection.subscriptions.push(...topics);
      console.log(`⚡ Connection ${connection.id} subscribed to:`, topics);
    }
  }

  private handleUnsubscribe(connection: WebSocketConnection, params: any): void {
    const { topics } = params;
    
    if (Array.isArray(topics)) {
      connection.subscriptions = connection.subscriptions.filter(sub => !topics.includes(sub));
      console.log(`⚡ Connection ${connection.id} unsubscribed from:`, topics);
    }
  }

  // Broadcast message to all connected clients
  broadcast(message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    
    for (const [id, connection] of this.connections) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(payload);
        } catch (error) {
          console.error(`❌ Failed to broadcast to ${id}:`, error);
        }
      }
    }
  }

  // Broadcast to subscribers of specific topics
  broadcastToSubscribers(topic: string, data: any): void {
    const message: WebSocketMessage = {
      id: uuidv4(),
      type: 'broadcast',
      data: { topic, ...data },
      timestamp: new Date()
    };

    const payload = JSON.stringify(message);

    for (const [id, connection] of this.connections) {
      if (connection.subscriptions.includes(topic) && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(payload);
        } catch (error) {
          console.error(`❌ Failed to send to subscriber ${id}:`, error);
        }
      }
    }
  }

  // Send message to specific connection
  private sendMessage(connection: WebSocketConnection, message: WebSocketMessage): void {
    if (connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Failed to send message to ${connection.id}:`, error);
      }
    }
  }

  // Send MCP response
  private sendMcpResponse(connection: WebSocketConnection, id: any, result: any): void {
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'mcp-response',
      data: {
        jsonrpc: '2.0',
        id,
        result
      },
      timestamp: new Date()
    });
  }

  // Send error response
  private sendError(connection: WebSocketConnection, message: string, code: number, id?: any): void {
    this.sendMessage(connection, {
      id: uuidv4(),
      type: 'mcp-response',
      data: {
        jsonrpc: '2.0',
        id: id || null,
        error: { code, message }
      },
      timestamp: new Date()
    });
  }

  // Authenticate WebSocket connection
  private authenticateConnection(_ws: WebSocket, request: any): boolean {
    if (!this.authMiddleware) {
      // If no auth middleware configured, allow all connections
      return true;
    }

    try {
      const url = parseUrl(request.url || '', true);
      const headers = request.headers;

      // Check for API key in query params or headers
      const apiKey = url.query?.apiKey as string || headers['x-api-key'] as string;
      if (apiKey && this.validateApiKey(apiKey)) {
        return true;
      }

      // Check for JWT token in query params or headers
      const token = url.query?.token as string ||
                   (headers.authorization as string)?.replace('Bearer ', '');
      if (token && this.validateJwtToken(token)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ WebSocket authentication error:', error);
      return false;
    }
  }

  // Get connection permissions based on authentication
  private getConnectionPermissions(request: any): string[] {
    if (!this.authMiddleware) {
      return ['read', 'analyze']; // Default permissions
    }

    try {
      const url = parseUrl(request.url || '', true);
      const headers = request.headers;

      // Check API key permissions
      const apiKey = url.query?.apiKey as string || headers['x-api-key'] as string;
      if (apiKey) {
        // This is a simplified check - in production, you'd validate against stored keys
        return ['read', 'analyze', 'stream'];
      }

      // Check JWT permissions
      const token = url.query?.token as string ||
                   (headers.authorization as string)?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = jwt.decode(token) as any;
          return decoded?.permissions || ['read'];
        } catch {
          return ['read'];
        }
      }

      return ['read'];
    } catch {
      return ['read'];
    }
  }

  // Validate API key (simplified - in production use proper hashing)
  private validateApiKey(apiKey: string | boolean): boolean {
    // This is a simplified validation - in production, use proper API key validation
    return typeof apiKey === 'string' && apiKey.length > 10;
  }

  // Validate JWT token
  private validateJwtToken(token: string): boolean {
    try {
      // This is a simplified validation - in production, use proper JWT verification
      const decoded = jwt.decode(token);
      return !!decoded;
    } catch {
      return false;
    }
  }

  // Start heartbeat to detect dead connections
  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      for (const [id, connection] of this.connections) {
        if (!connection.isAlive) {
          console.log(`💀 Terminating dead connection: ${id}`);
          connection.ws.terminate();
          this.connections.delete(id);
          continue;
        }

        connection.isAlive = false;
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping();
        }
      }
    }, 30000); // 30 seconds
  }

  // Get connection statistics
  getConnectionStats() {
    return {
      totalConnections: this.connections.size,
      activeConnections: Array.from(this.connections.values())
        .filter(conn => conn.ws.readyState === WebSocket.OPEN).length,
      subscriptions: Array.from(this.connections.values())
        .reduce((acc, conn) => acc + conn.subscriptions.length, 0)
    };
  }
}