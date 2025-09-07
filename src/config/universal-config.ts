// Universal MCP Server Configuration
import { UniversalServerConfig } from '../types/universal-types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get configuration with environment variable overrides
export function getUniversalConfig(): UniversalServerConfig {
  return {
    // Protocol configuration - match the ProtocolConfig interface
    protocols: {
      stdio: process.env.STDIO_ENABLED !== 'false',
      http: process.env.HTTP_ENABLED !== 'false', 
      websocket: process.env.WEBSOCKET_ENABLED !== 'false',
      rest: process.env.REST_API_ENABLED !== 'false'
    },

    // Server configuration - match the server interface
    server: {
      host: process.env.HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '3000'),
      timeout: parseInt(process.env.SERVER_TIMEOUT || '30000'),
      maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100')
    },

    // Security configuration
    security: {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-request-id'],
        credentials: process.env.CORS_CREDENTIALS === 'true'
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
      },
      authentication: {
        enabled: process.env.AUTH_ENABLED !== 'false',
        apiKeyHeader: 'x-api-key',
        jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
      },
      apiKeys: process.env.API_KEYS_ENABLED !== 'false'
    },

    // Database configuration - match the DatabaseConfig interface
    database: {
      mongodb: {
        url: process.env.MONGODB_URI || 'mongodb://localhost:27017/cnis',
        options: {
          maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10'),
          serverSelectionTimeoutMS: parseInt(process.env.MONGODB_TIMEOUT || '5000')
        }
      },
      redis: {
        url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}/${process.env.REDIS_DB || '0'}`,
        options: {}
      }
    },

    // AI provider configuration - match the AIProviderConfig interface
    aiProviders: [{
      providers: [
        {
          name: 'openai',
          type: 'openai' as const,
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096'),
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
        },
        {
          name: 'anthropic',
          type: 'anthropic' as const,
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
          maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096'),
          temperature: parseFloat(process.env.ANTHROPIC_TEMPERATURE || '0.7')
        }
      ],
      fallbackChain: ['openai', 'anthropic'],
      loadBalancing: false,
      costOptimization: true
    }],

    // CNiS-specific configuration (preserved from original, match CNiSConfig interface)
    cnis: {
      cache_ttl_minutes: parseInt(process.env.CACHE_TTL_MINUTES || '10'),
      news_fetch_interval: parseInt(process.env.NEWS_FETCH_INTERVAL || '300000'), // 5 minutes  
      credibility_threshold: parseFloat(process.env.CREDIBILITY_THRESHOLD || '0.6'),
      impact_threshold: parseFloat(process.env.IMPACT_THRESHOLD || '0.7'),
      max_news_age_hours: parseInt(process.env.MAX_NEWS_AGE_HOURS || '24')
    }
  };
}

// Validate configuration
export function validateConfig(config: UniversalServerConfig): void {
  // Validate port range
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error(`Invalid port number: ${config.server.port}`);
  }

  // Validate JWT secret length
  if (config.security.authentication.enabled && config.security.authentication.jwtSecret && config.security.authentication.jwtSecret.length < 32) {
    console.warn('⚠️ JWT secret should be at least 32 characters long for security');
  }

  // Check AI provider availability
  const hasProviders = config.aiProviders.some(providerConfig => 
    providerConfig.providers.some(provider => provider.apiKey)
  );
  if (!hasProviders) {
    console.warn('⚠️ No AI providers configured. Analysis features may not work.');
  }

  console.log('✅ Configuration validation passed');
}

// Get configuration with validation
export function getValidatedConfig(): UniversalServerConfig {
  const config = getUniversalConfig();
  validateConfig(config);
  return config;
}

// Development configuration overrides
export function getDevelopmentConfig(): UniversalServerConfig {
  const config = getUniversalConfig();
  
  // Override for development
  config.security.authentication.enabled = false; // Disable auth for easier development
  config.security.rateLimit.max = 1000; // Higher limits for development
  
  return config;
}

// Production configuration overrides
export function getProductionConfig(): UniversalServerConfig {
  const config = getUniversalConfig();
  
  // Override for production
  config.security.authentication.enabled = true;
  if (process.env.ALLOWED_ORIGINS) {
    config.security.cors.origin = process.env.ALLOWED_ORIGINS.split(',');
  }
  
  return config;
}

// Export default configuration
export default getUniversalConfig;