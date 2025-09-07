// Security Middleware - Helmet, CORS, and security headers
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { UniversalServerConfig } from '../types/universal-types.js';

export class SecurityMiddleware {
  private config: UniversalServerConfig;

  constructor(config: UniversalServerConfig) {
    this.config = config;
  }

  // Setup Helmet security middleware
  getHelmetMiddleware() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow WebSocket connections
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }

  // Setup CORS middleware
  getCorsMiddleware() {
    return cors({
      origin: this.config.security.cors.origin,
      methods: this.config.security.cors.methods,
      allowedHeaders: this.config.security.cors.allowedHeaders,
      credentials: this.config.security.cors.credentials,
      optionsSuccessStatus: 200
    });
  }

  // Setup compression middleware
  getCompressionMiddleware() {
    return compression({
      filter: (req: Request, res: Response) => {
        // Don't compress WebSocket upgrade requests
        if (req.headers.upgrade) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6, // Balanced compression level
      threshold: 1024 // Only compress responses > 1KB
    });
  }

  // Request sanitization middleware
  sanitizeRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add request start time for performance monitoring
      (req as any).startTime = Date.now();

      // Sanitize query parameters
      if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string') {
            // Basic XSS protection
            req.query[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          }
        }
      }

      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        this.sanitizeObject(req.body);
      }

      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

      next();
    };
  }

  // Recursive object sanitization
  private sanitizeObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Basic XSS and SQL injection protection
        obj[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .replace(/('|(\\')|(;)|(\\x)|(\\u))/g, '');
      } else if (typeof value === 'object' && value !== null) {
        this.sanitizeObject(value);
      }
    }
  }

  // Request validation middleware
  validateRequest() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check request size
      const contentLength = parseInt(req.get('content-length') || '0');
      if (contentLength > 10 * 1024 * 1024) { // 10MB limit
        return res.status(413).json({
          error: 'Request too large',
          maxSize: '10MB'
        });
      }

      // Validate Content-Type for POST requests
      if (req.method === 'POST' && !req.is('application/json')) {
        return res.status(400).json({
          error: 'Invalid Content-Type',
          expected: 'application/json'
        });
      }

      // Validate JSON structure for MCP endpoints (allow JSON-RPC 2.0)
      if (req.path.includes('/mcp') && req.method === 'POST') {
        if (!req.body || typeof req.body !== 'object') {
          return res.status(400).json({
            error: 'Invalid request body',
            expected: 'JSON object'
          });
        }
        
        // Additional validation for JSON-RPC 2.0 format
        if (req.body.jsonrpc && req.body.jsonrpc !== '2.0') {
          return res.status(400).json({
            error: 'Invalid JSON-RPC version',
            expected: '2.0'
          });
        }
      }

      next();
    };
  }

  // Error handling middleware
  errorHandler() {
    return (err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('🔒 Security Error:', err);

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          error: 'Validation failed',
          message: isDevelopment ? err.message : 'Invalid request data'
        });
      }

      if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large',
          message: 'Request exceeds size limit'
        });
      }

      // Generic error response
      res.status(500).json({
        error: 'Internal server error',
        message: isDevelopment ? err.message : 'An error occurred processing your request',
        timestamp: new Date().toISOString()
      });
    };
  }

  // Setup timeout middleware
  timeout(timeoutMs: number = 30000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          res.status(408).json({
            error: 'Request timeout',
            timeout: `${timeoutMs}ms`
          });
        }
      }, timeoutMs);

      // Clear timeout when response finishes
      res.on('finish', () => clearTimeout(timeout));
      res.on('close', () => clearTimeout(timeout));

      next();
    };
  }

  // Security headers for API responses
  apiSecurityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // API-specific security headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Prevent API responses from being embedded
      res.setHeader('X-Frame-Options', 'DENY');
      
      // Add API version header
      res.setHeader('X-API-Version', '2.0.0');
      
      next();
    };
  }

  // Rate limiting bypass for health checks
  healthCheckBypass() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/health' || req.path === '/api/health') {
        // Mark as health check to bypass rate limiting
        (req as any).isHealthCheck = true;
      }
      next();
    };
  }
}