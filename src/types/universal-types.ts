// Universal MCP Server Types - Extended from CNiS types
import { NewsItem, AnalyzedNews, MarketSummary } from '../types.js';

// Protocol Configuration
export interface ProtocolConfig {
  stdio: boolean;
  http: boolean;
  websocket: boolean;
  rest: boolean;
}

// Server Configuration
export interface UniversalServerConfig {
  protocols: ProtocolConfig;
  server: {
    host: string;
    port: number;
    timeout: number;
    maxConnections: number;
  };
  security: {
    cors: CorsConfig;
    rateLimit: RateLimitConfig;
    authentication: AuthConfig;
    apiKeys: boolean;
  };
  database: DatabaseConfig;
  aiProviders: AIProviderConfig[];
  cnis: CNiSConfig;
}

// CORS Configuration
export interface CorsConfig {
  origin: string[] | string | boolean;
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
}

// Rate Limiting Configuration
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

// Authentication Configuration
export interface AuthConfig {
  enabled: boolean;
  apiKeyHeader: string;
  jwtSecret?: string;
  bcryptRounds: number;
}

// Database Configuration
export interface DatabaseConfig {
  mongodb?: {
    url: string;
    options: object;
  };
  redis?: {
    url: string;
    options: object;
  };
  postgresql?: {
    url: string;
    options: object;
  };
}

// CNiS-specific Configuration (preserved from original)
export interface CNiSConfig {
  cache_ttl_minutes: number;
  news_fetch_interval: number;
  credibility_threshold: number;
  impact_threshold: number;
  max_news_age_hours: number;
}

// AI Provider Types
export interface AIProvider {
  name: string;
  type: 'openai' | 'anthropic' | 'google' | 'local';
  apiKey?: string;
  endpoint?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIProviderConfig {
  providers: AIProvider[];
  fallbackChain: string[];
  loadBalancing: boolean;
  costOptimization: boolean;
}

// WebSocket Types
export interface WebSocketConnection {
  id: string;
  ws: any; // WebSocket
  isAlive: boolean;
  subscriptions: string[];
  userId?: string;
  apiKey?: string;
}

export interface WebSocketMessage {
  id: string;
  type: 'mcp-request' | 'mcp-response' | 'broadcast' | 'ping' | 'pong';
  data: any;
  timestamp: Date;
}

// Protocol Handler Interfaces
export interface ProtocolHandler {
  name: string;
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  handleRequest(request: any): Promise<any>;
}

export interface StdioHandler extends ProtocolHandler {
  name: 'stdio';
  server: any; // MCP Server instance
}

export interface HttpMcpHandler extends ProtocolHandler {
  name: 'http-mcp';
  endpoint: string;
  handleJsonRpc(request: any): Promise<any>;
}

export interface WebSocketMcpHandler extends ProtocolHandler {
  name: 'websocket-mcp';
  connections: Map<string, WebSocketConnection>;
  broadcast(message: WebSocketMessage): void;
  handleConnection(ws: any): void;
  handleMessage(connection: WebSocketConnection, message: any): Promise<void>;
}

export interface RestApiHandler extends ProtocolHandler {
  name: 'rest-api';
  routes: RestRoute[];
  handleToolRequest(toolName: string, params: any): Promise<any>;
}

// REST API Types
export interface RestRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: any, res: any) => Promise<void>;
  middleware?: string[];
}

// Middleware Types
export interface MiddlewareConfig {
  security: boolean;
  authentication: boolean;
  rateLimit: boolean;
  logging: boolean;
  compression: boolean;
  validation: boolean;
}

// Authentication Types
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit?: RateLimitConfig;
  createdAt: Date;
  lastUsed?: Date;
  active: boolean;
}

export interface AuthenticatedRequest {
  apiKey?: ApiKey;
  userId?: string;
  permissions: string[];
}

// Monitoring Types
export interface ServerMetrics {
  timestamp: Date;
  requests: {
    total: number;
    byProtocol: Record<string, number>;
    byTool: Record<string, number>;
    errors: number;
  };
  performance: {
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  };
  cnis: {
    newsItemsProcessed: number;
    rssSourcesActive: number;
    cacheHitRate: number;
    analysisPerformed: number;
  };
}

// Tool Registry Types
export interface UniversalTool {
  name: string;
  description: string;
  inputSchema: object;
  permissions: string[];
  rateLimit?: RateLimitConfig;
  handler: (params: any, context: ToolContext) => Promise<any>;
}

export interface ToolContext {
  protocol: 'stdio' | 'http-mcp' | 'websocket-mcp' | 'rest-api';
  apiKey?: ApiKey;
  userId?: string;
  connectionId?: string;
  requestId: string;
}

// Real-time Updates Types
export interface RealTimeUpdate {
  id: string;
  type: 'news-update' | 'analysis-complete' | 'market-alert';
  data: any;
  timestamp: Date;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

// CNiS-specific Extended Types
export interface EnhancedNewsItem extends NewsItem {
  realTimeId?: string;
  processingStatus: 'pending' | 'analyzing' | 'complete' | 'error';
  enhancedAnalysis?: {
    aiSentiment?: number;
    marketImpactPrediction?: string;
    riskAssessment?: string;
  };
}

export interface StreamingAnalysis {
  newsId: string;
  progress: number;
  currentStage: string;
  results?: Partial<AnalyzedNews>;
  error?: string;
}

// Error Types
export interface UniversalError {
  code: number;
  message: string;
  details?: any;
  protocol: string;
  timestamp: Date;
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  protocols: Record<string, boolean>;
  dependencies: {
    database?: boolean;
    redis?: boolean;
    rssSources?: boolean;
    aiProviders?: boolean;
  };
  metrics: ServerMetrics;
  uptime: number;
}

// Migration Types (for preserving existing functionality)
export interface MigrationStatus {
  version: string;
  migratedAt: Date;
  preservedFeatures: string[];
  newFeatures: string[];
  compatibility: {
    claudeDesktop: boolean;
    n8nNodesMcp: boolean;
    mcpInspector: boolean;
    customClients: boolean;
  };
}