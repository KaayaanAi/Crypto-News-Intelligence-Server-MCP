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
  private config: UniversalServerConfig;
  private apiKeys: Map<string, ApiKey> = new Map();
  private jwtSecret: string;

  constructor(config: UniversalServerConfig) {
    this.config = config;
    this.jwtSecret = config.security.authentication.jwtSecret || 'fallback-secret-change-in-production';
    this.initializeDefaultApiKeys();
  }

  // Initialize default API keys (in production, these would come from a database)
  private initializeDefaultApiKeys(): void {
    const defaultKeys: ApiKey[] = [
      {
        id: uuidv4(),
        key: this.hashApiKey('cnis-demo-key-12345'),
        name: 'Demo API Key',
        permissions: ['read', 'analyze'],
        createdAt: new Date(),
        active: true
      },
      {
        id: uuidv4(),
        key: this.hashApiKey('cnis-admin-key-67890'),
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
      }
    ];

    defaultKeys.forEach(key => {
      this.apiKeys.set(key.key, key);
    });

    console.log('🔐 Initialized API keys:', defaultKeys.length);
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
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      if (!req.permissions || !req.permissions.includes(permission)) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permission,
          available: req.permissions || [],
          message: `This endpoint requires '${permission}' permission`
        });
      }
      next();
    };
  }

  // Multiple permissions check (requires ALL permissions)
  requirePermissions(permissions: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const userPermissions = req.permissions || [];
      const missingPermissions = permissions.filter(perm => !userPermissions.includes(perm));

      if (missingPermissions.length > 0) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
          missing: missingPermissions,
          available: userPermissions,
          message: `This endpoint requires permissions: ${permissions.join(', ')}`
        });
      }
      next();
    };
  }

  // Any of multiple permissions check (requires ANY permission)
  requireAnyPermission(permissions: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
      const userPermissions = req.permissions || [];
      const hasAnyPermission = permissions.some(perm => userPermissions.includes(perm));

      if (!hasAnyPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          requiredAny: permissions,
          available: userPermissions,
          message: `This endpoint requires any of these permissions: ${permissions.join(', ')}`
        });
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
    const secret = this.jwtSecret || 'fallback-secret';
    
    return jwt.sign(payload, secret, { expiresIn } as any);
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
    for (const [hashedKey, keyData] of this.apiKeys) {
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
      const authInfo = {
        authenticated: !!(req.apiKey || req.userId),
        method: req.apiKey ? 'api-key' : req.userId ? 'jwt' : 'none',
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
    return async (req: Request, res: Response) => {
      try {
        const { username, password, apiKey } = req.body;

        if (apiKey) {
          // API key authentication
          const keyData = this.verifyApiKey(apiKey);
          if (keyData) {
            const token = this.generateJWT(keyData.id, keyData.permissions);
            return res.json({
              token,
              permissions: keyData.permissions,
              expiresIn: '24h'
            });
          }
        } else if (username && password) {
          // Username/password authentication (would typically check database)
          if (username === 'admin' && password === 'changeme') {
            const token = this.generateJWT('admin-user', ['read', 'analyze', 'admin']);
            return res.json({
              token,
              permissions: ['read', 'analyze', 'admin'],
              expiresIn: '24h'
            });
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