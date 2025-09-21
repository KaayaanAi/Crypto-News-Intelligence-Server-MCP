// Authentication Middleware - API Key and JWT authentication
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ApiKey, UniversalServerConfig } from '../types/universal-types.js';

// Extend Express Request type
interface AuthRequest extends Request {
  apiKey?: ApiKey;
  userId?: string;
  permissions: string[];
}

export class AuthMiddleware {
  private readonly config: UniversalServerConfig;
  private readonly apiKeys: Map<string, ApiKey> = new Map();
  private readonly jwtSecret: string;

  constructor(config: UniversalServerConfig) {
    this.config = config;
    this.jwtSecret = this.initializeJwtSecret(config);
    this.initializeDefaultApiKeys();
  }

  // Initialize JWT secret with secure fallback
  private initializeJwtSecret(config: UniversalServerConfig): string {
    const secret = config.security.authentication.jwtSecret || process.env.JWT_SECRET;

    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET environment variable is required in production');
      }

      // Generate a secure random secret for development
      const crypto = require('crypto');
      const generatedSecret = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️  No JWT secret configured. Generated temporary secret for development.');
      console.warn('⚠️  Set JWT_SECRET environment variable for production!');
      return generatedSecret;
    }

    if (secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters long');
    }

    return secret;
  }

  // Initialize API keys from environment variables (secure method)
  private initializeDefaultApiKeys(): void {
    const defaultKeys: ApiKey[] = [];

    // Only create demo key if explicitly configured in environment
    const demoKey = process.env.DEMO_API_KEY;
    if (demoKey && process.env.NODE_ENV !== 'production') {
      defaultKeys.push({
        id: uuidv4(),
        key: this.hashApiKey(demoKey),
        name: 'Demo API Key',
        permissions: ['read'],
        createdAt: new Date(),
        active: true
      });
    }

    // Only create admin key if explicitly configured
    const adminKey = process.env.ADMIN_API_KEY;
    if (adminKey) {
      defaultKeys.push({
        id: uuidv4(),
        key: this.hashApiKey(adminKey),
        name: 'Admin API Key',
        permissions: ['read', 'analyze', 'admin', 'stream'],
        createdAt: new Date(),
        active: true,
        rateLimit: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 5000, // Higher limit for admin key
          message: 'Admin API key rate limit exceeded',
          standardHeaders: true,
          legacyHeaders: false
        }
      });
    }

    defaultKeys.forEach(key => {
      this.apiKeys.set(key.key, key);
    });

    if (defaultKeys.length === 0) {
      console.log('⚠️  No API keys configured. Set ADMIN_API_KEY environment variable.');
    } else {
      console.log('🔐 Initialized API keys:', defaultKeys.length);
    }
  }

  // Hash API key for secure storage
  private hashApiKey(key: string): string {
    return bcrypt.hashSync(key, this.config.security.authentication.bcryptRounds);
  }

  // Verify API key
  private verifyApiKey(providedKey: string): ApiKey | null {
    for (const [hashedKey, apiKeyData] of this.apiKeys) {
      if (bcrypt.compareSync(providedKey, hashedKey) && apiKeyData.active) {
        // Update last used timestamp
        apiKeyData.lastUsed = new Date();
        return apiKeyData;
      }
    }
    return null;
  }

  // Optional authentication middleware (doesn't block requests)
  optionalAuth() {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      req.permissions = ['read']; // Default permissions

      try {
        // Check for API key
        const apiKey = req.headers['x-api-key'] as string;
        if (apiKey) {
          const keyData = this.verifyApiKey(apiKey);
          if (keyData) {
            req.apiKey = keyData;
            req.permissions = keyData.permissions;
            res.setHeader('X-Auth-Method', 'api-key');
          }
        }

        // Check for JWT token
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          try {
            const decoded = jwt.verify(token, this.jwtSecret) as any;
            req.userId = decoded.userId;
            req.permissions = decoded.permissions || ['read'];
            res.setHeader('X-Auth-Method', 'jwt');
          } catch (jwtError) {
            // Invalid JWT, but we don't block the request in optional mode
            console.warn('⚠️ Invalid JWT token provided');
          }
        }

        next();
      } catch (error) {
        console.error('❌ Optional auth error:', error);
        next(); // Continue without authentication
      }
    };
  }

  // Required authentication middleware (blocks unauthenticated requests)
  requireAuth() {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!this.config.security.authentication.enabled) {
        req.permissions = ['read', 'analyze']; // Full permissions when auth disabled
        return next();
      }

      req.permissions = [];

      try {
        let authenticated = false;

        // Check for API key
        const apiKey = req.headers['x-api-key'] as string;
        if (apiKey) {
          const keyData = this.verifyApiKey(apiKey);
          if (keyData) {
            req.apiKey = keyData;
            req.permissions = keyData.permissions;
            authenticated = true;
            res.setHeader('X-Auth-Method', 'api-key');
          }
        }

        // Check for JWT token if no API key
        if (!authenticated) {
          const authHeader = req.headers.authorization;
          if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
              const decoded = jwt.verify(token, this.jwtSecret) as any;
              req.userId = decoded.userId;
              req.permissions = decoded.permissions || ['read'];
              authenticated = true;
              res.setHeader('X-Auth-Method', 'jwt');
            } catch (jwtError) {
              console.warn('⚠️ Invalid JWT token provided');
            }
          }
        }

        if (!authenticated) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide a valid API key or JWT token',
            authMethods: ['API Key (x-api-key header)', 'JWT (Bearer token)']
          });
        }

        next();
      } catch (error) {
        console.error('❌ Authentication error:', error);
        res.status(500).json({
          error: 'Authentication failed',
          message: 'Internal authentication error'
        });
      }
    };
  }

  // Permission check middleware
  requirePermission(permission: string) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.permissions?.includes(permission)) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: permission,
          available: req.permissions || [],
          message: `This endpoint requires '${permission}' permission`
        });
        return;
      }
      next();
    };
  }

  // Multiple permissions check (requires ALL permissions)
  requirePermissions(permissions: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      const userPermissions = req.permissions || [];
      const missingPermissions = permissions.filter(perm => !userPermissions.includes(perm));

      if (missingPermissions.length > 0) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
          missing: missingPermissions,
          available: userPermissions,
          message: `This endpoint requires permissions: ${permissions.join(', ')}`
        });
        return;
      }
      next();
    };
  }

  // Any of multiple permissions check (requires ANY permission)
  requireAnyPermission(permissions: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      const userPermissions = req.permissions || [];
      const hasAnyPermission = permissions.some(perm => userPermissions.includes(perm));

      if (!hasAnyPermission) {
        res.status(403).json({
          error: 'Insufficient permissions',
          requiredAny: permissions,
          available: userPermissions,
          message: `This endpoint requires any of these permissions: ${permissions.join(', ')}`
        });
        return;
      }
      next();
    };
  }

  // Admin-only middleware
  requireAdmin() {
    return this.requirePermission('admin');
  }

  // Generate JWT token
  generateJWT(userId: string, permissions: string[], expiresIn: string = '24h'): string {
    const payload = {
      userId,
      permissions
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn } as any);
  }

  // Create new API key
  async createApiKey(name: string, permissions: string[]): Promise<{ key: string; keyData: ApiKey }> {
    const rawKey = `cnis-${uuidv4().replace(/-/g, '').substring(0, 24)}`;
    const hashedKey = this.hashApiKey(rawKey);
    
    const keyData: ApiKey = {
      id: uuidv4(),
      key: hashedKey,
      name,
      permissions,
      createdAt: new Date(),
      active: true
    };

    this.apiKeys.set(hashedKey, keyData);

    return {
      key: rawKey, // Return unhashed key to user (only time they'll see it)
      keyData
    };
  }

  // Revoke API key
  async revokeApiKey(keyId: string): Promise<boolean> {
    for (const [, keyData] of this.apiKeys) {
      if (keyData.id === keyId) {
        keyData.active = false;
        return true;
      }
    }
    return false;
  }

  // List API keys (without exposing the actual keys)
  listApiKeys(): Omit<ApiKey, 'key'>[] {
    return Array.from(this.apiKeys.values()).map(({ key, ...rest }) => rest);
  }

  // Authentication info endpoint handler
  getAuthInfo() {
    return (req: AuthRequest, res: Response) => {
      let authMethod = 'none';
      if (req.apiKey) {
        authMethod = 'api-key';
      } else if (req.userId) {
        authMethod = 'jwt';
      }

      const authInfo = {
        authenticated: !!(req.apiKey || req.userId),
        method: authMethod,
        permissions: req.permissions || [],
        user: req.userId,
        apiKeyName: req.apiKey?.name,
        apiKeyId: req.apiKey?.id
      };

      res.json({
        auth: authInfo,
        authMethods: {
          apiKey: {
            header: 'x-api-key',
            description: 'Provide your API key in the x-api-key header'
          },
          jwt: {
            header: 'Authorization',
            format: 'Bearer <token>',
            description: 'Provide JWT token as Bearer token in Authorization header'
          }
        },
        availablePermissions: [
          'read - Read access to all data',
          'analyze - Access to analysis tools',
          'stream - Access to real-time streaming features',
          'admin - Administrative access'
        ]
      });
    };
  }

  // Login endpoint (for JWT authentication)
  login() {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const { username, password, apiKey } = req.body;

        if (apiKey) {
          // API key authentication
          const keyData = this.verifyApiKey(apiKey);
          if (keyData) {
            const token = this.generateJWT(keyData.id, keyData.permissions);
            res.json({
              token,
              permissions: keyData.permissions,
              expiresIn: '24h'
            });
            return;
          }
        } else if (username && password) {
          // Username/password authentication - check environment variables
          const adminUsername = process.env.ADMIN_USERNAME;
          const adminPassword = process.env.ADMIN_PASSWORD;

          if (adminUsername && adminPassword && username === adminUsername && password === adminPassword) {
            const token = this.generateJWT('admin-user', ['read', 'analyze', 'admin']);
            res.json({
              token,
              permissions: ['read', 'analyze', 'admin'],
              expiresIn: '24h'
            });
            return;
          }
        }

        res.status(401).json({
          error: 'Invalid credentials',
          message: 'Please provide valid username/password or API key'
        });

      } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
          error: 'Login failed',
          message: 'Internal authentication error'
        });
      }
    };
  }

  // Get authentication statistics
  getStats(): { totalApiKeys: number; activeApiKeys: number; recentActivity: number } {
    const totalApiKeys = this.apiKeys.size;
    const activeApiKeys = Array.from(this.apiKeys.values()).filter(key => key.active).length;
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentActivity = Array.from(this.apiKeys.values())
      .filter(key => key.lastUsed && key.lastUsed.getTime() > last24Hours).length;

    return {
      totalApiKeys,
      activeApiKeys,
      recentActivity
    };
  }
}