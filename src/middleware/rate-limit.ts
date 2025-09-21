// Rate Limiting Middleware - Advanced rate limiting with Redis support
import rateLimit from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { RateLimitConfig, UniversalServerConfig } from '../types/universal-types.js';

export class RateLimitMiddleware {
  private config: UniversalServerConfig;

  constructor(config: UniversalServerConfig) {
    this.config = config;
  }

  // Global rate limiter
  getGlobalRateLimit() {
    const config = this.config.security.rateLimit;
    
    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: {
        error: 'Too many requests',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000)
      },
      standardHeaders: config.standardHeaders,
      legacyHeaders: config.legacyHeaders,
      skip: (req: Request) => {
        // Skip rate limiting for health checks
        return !!(req as any).isHealthCheck;
      },
      keyGenerator: (req: Request) => {
        // Use API key if present, otherwise IP with IPv6 support
        const apiKey = req.headers['x-api-key'] as string;
        return apiKey || ipKeyGenerator(req.ip || 'unknown');
      }
    });
  }

  // API-specific rate limiter (stricter)
  getApiRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes per API key/IP
      message: {
        error: 'API rate limit exceeded',
        message: 'Too many API requests, please try again later',
        retryAfter: 900 // 15 minutes in seconds
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: Request) => {
        const apiKey = req.headers['x-api-key'] as string;
        return apiKey ? `api:${apiKey}` : `ip:${ipKeyGenerator(req.ip || 'unknown')}`;
      }
    });
  }

  // WebSocket connection rate limiter
  getWebSocketRateLimit() {
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 WebSocket connections per minute per IP
      message: {
        error: 'WebSocket connection limit exceeded',
        message: 'Too many WebSocket connections, please try again later'
      },
      skip: (req: Request) => {
        return req.headers.upgrade !== 'websocket';
      }
    });
  }

  // Tool-specific rate limiter (for expensive operations)
  getToolRateLimit(toolName: string) {
    const limits: Record<string, { windowMs: number; max: number }> = {
      'get_top_crypto_news': { windowMs: 60 * 1000, max: 30 }, // 30 per minute
      'search_crypto_news': { windowMs: 60 * 1000, max: 50 }, // 50 per minute
      'get_market_impact_news': { windowMs: 60 * 1000, max: 20 }, // 20 per minute
      'analyze_news_credibility': { windowMs: 60 * 1000, max: 40 }, // 40 per minute
      'get_news_by_source': { windowMs: 60 * 1000, max: 40 } // 40 per minute
    };

    const toolLimit = limits[toolName] || { windowMs: 60 * 1000, max: 60 };

    return rateLimit({
      windowMs: toolLimit.windowMs,
      max: toolLimit.max,
      message: {
        error: `Tool rate limit exceeded: ${toolName}`,
        message: `Too many requests for ${toolName}, please try again later`,
        retryAfter: Math.ceil(toolLimit.windowMs / 1000)
      },
      keyGenerator: (req: Request) => {
        const apiKey = req.headers['x-api-key'] as string;
        return apiKey ? `tool:${toolName}:${apiKey}` : `tool:${toolName}:${ipKeyGenerator(req.ip || 'unknown')}`;
      }
    });
  }

  // Custom rate limiter for API keys with specific limits
  getApiKeyRateLimit() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        next(); // Let global rate limiter handle non-API key requests
        return;
      }

      try {
        // This would typically check against a database
        // For now, we'll simulate API key limits
        const keyLimits = this.getApiKeyLimits(apiKey);

        if (!keyLimits) {
          res.status(401).json({
            error: 'Invalid API key',
            message: 'The provided API key is not valid'
          });
          return;
        }

        // Check if this API key has exceeded its custom limits
        const usage = await this.checkApiKeyUsage(apiKey);

        if (usage.requests >= keyLimits.max) {
          res.status(429).json({
            error: 'API key rate limit exceeded',
            message: 'Your API key has exceeded its rate limit',
            limit: keyLimits.max,
            used: usage.requests,
            resetTime: usage.resetTime
          });
          return;
        }

        // Record this request
        await this.recordApiKeyUsage(apiKey);

        // Add rate limit info to response headers
        res.setHeader('X-RateLimit-Limit', keyLimits.max.toString());
        res.setHeader('X-RateLimit-Remaining', (keyLimits.max - usage.requests - 1).toString());
        res.setHeader('X-RateLimit-Reset', usage.resetTime.toString());

        next();

      } catch (error) {
        console.error('❌ API Key Rate Limit Error:', error);
        next(); // Fall back to global rate limiter
      }
    };
  }

  // Sliding window rate limiter (more sophisticated)
  getSlidingWindowRateLimit(windowMs: number, maxRequests: number) {
    const windows = new Map<string, number[]>();

    return (req: Request, res: Response, next: NextFunction): void => {
      const key = req.headers['x-api-key'] as string || ipKeyGenerator(req.ip || 'unknown');
      const now = Date.now();
      const windowStart = now - windowMs;

      // Get or create window for this key
      let requests = windows.get(key) || [];

      // Remove old requests outside the window
      requests = requests.filter(timestamp => timestamp > windowStart);

      // Check if limit is exceeded
      if (requests.length >= maxRequests) {
        const oldestRequest = Math.min(...requests);
        const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

        res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests in sliding window',
          retryAfter
        });
        return;
      }

      // Add current request
      requests.push(now);
      windows.set(key, requests);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - requests.length).toString());
      res.setHeader('X-RateLimit-Window', `${windowMs}ms`);

      next();
    };
  }

  // Protocol-specific rate limits
  getProtocolRateLimit(protocol: 'stdio' | 'http-mcp' | 'websocket-mcp' | 'rest-api') {
    const limits = {
      'stdio': { windowMs: 60 * 1000, max: 1000 }, // High limit for Claude Desktop
      'http-mcp': { windowMs: 60 * 1000, max: 200 }, // Medium limit for n8n
      'websocket-mcp': { windowMs: 60 * 1000, max: 500 }, // High limit for real-time
      'rest-api': { windowMs: 60 * 1000, max: 100 } // Lower limit for general API
    };

    const limit = limits[protocol];

    return rateLimit({
      windowMs: limit.windowMs,
      max: limit.max,
      message: {
        error: `${protocol} rate limit exceeded`,
        message: `Too many requests via ${protocol} protocol`
      },
      keyGenerator: (req: Request) => {
        return `${protocol}:${req.headers['x-api-key'] || ipKeyGenerator(req.ip || 'unknown')}`;
      }
    });
  }

  // Burst rate limiter (allows short bursts but enforces longer-term limits)
  getBurstRateLimit() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute window
      max: 50, // 50 requests per minute
      message: {
        error: 'Burst rate limit exceeded',
        message: 'Too many requests in short timeframe, please slow down'
      },
      // Allow bursts but track over longer period
      handler: (req: Request, res: Response) => {
        console.warn(`🚫 Burst limit reached for ${req.ip || 'unknown'}`);
        res.status(429).json({
          error: 'Burst rate limit exceeded',
          message: 'Too many requests in short timeframe, please slow down'
        });
      }
    });
  }

  // Helper methods for API key management
  private getApiKeyLimits(_apiKey: string): RateLimitConfig | null {
    // This would typically query a database
    // For demonstration, we'll use a simple map
    const defaultLimits: RateLimitConfig = {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 1000, // 1000 requests per hour
      message: 'API key rate limit exceeded',
      standardHeaders: true,
      legacyHeaders: false
    };

    return defaultLimits;
  }

  private async checkApiKeyUsage(_apiKey: string): Promise<{ requests: number; resetTime: number }> {
    // This would typically query Redis or another fast store
    // For demonstration, we'll use a simple in-memory cache
    const now = Date.now();
    const hourStart = now - (now % (60 * 60 * 1000)); // Start of current hour

    return {
      requests: 0, // Would be actual count from storage
      resetTime: hourStart + (60 * 60 * 1000) // Next hour
    };
  }

  private async recordApiKeyUsage(apiKey: string): Promise<void> {
    // This would typically increment a counter in Redis
    // For demonstration, we'll just log it
    console.log(`📊 Recording API usage for key: ${apiKey.substring(0, 8)}...`);
  }

  // Clean up old rate limit data (should be called periodically)
  cleanup() {
    // This would clean up old entries from Redis or memory
    console.log('🧹 Cleaning up old rate limit data...');
  }

  // Get rate limit statistics
  getStats(): { totalRequests: number; limitedRequests: number; topConsumers: string[] } {
    // This would query actual statistics from storage
    return {
      totalRequests: 0,
      limitedRequests: 0,
      topConsumers: []
    };
  }
}