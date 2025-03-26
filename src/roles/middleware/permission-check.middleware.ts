import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PermissionsService } from '../services/permissions.service';
import { RolesService } from '../services/roles.service';

@Injectable()
export class PermissionCheckMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PermissionCheckMiddleware.name);
  private permissionCache: Map<string, boolean> = new Map();

  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly rolesService: RolesService,
  ) {}

  /**
   * Check if a user has a specific permission
   * Uses a simple cache to improve performance for frequently checked permissions
   */
  private async checkPermission(userId: string, permissionKey: string): Promise<boolean> {
    // Create a cache key using the userId and permissionKey
    const cacheKey = `${userId}:${permissionKey}`;
    
    // Check if we have the result cached
    if (this.permissionCache.has(cacheKey)) {
      return this.permissionCache.get(cacheKey) ?? false;
    }
    
    try {
      // Get the user's roles
      const userRoles = await this.rolesService.getRolesByUserId(userId);
      
      // Check each role for the required permission
      for (const role of userRoles) {
        // Get permissions for this role
        const rolePermissions = await this.permissionsService.getPermissionsByRoleId(role.id);
        
        // Check if any permission matches the required key
        const hasPermission = rolePermissions.some(permission => {
          const key = `${permission.resource}:${permission.action}`;
          return key === permissionKey;
        });
        
        if (hasPermission) {
          // Cache the positive result (TTL could be implemented here)
          this.permissionCache.set(cacheKey, true);
          return true;
        }
      }
      
      // Cache the negative result (TTL could be implemented here)
      this.permissionCache.set(cacheKey, false);
      return false;
    } catch (error) {
      this.logger.error(`Error checking permission ${permissionKey} for user ${userId}: ${error.message}`);
      return false;
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip if no user (authentication will fail anyway)
    if (!req.user) {
      next();
      return;
    }

    // Extract route information to determine required permission
    const method = req.method.toLowerCase();
    const path = req.route?.path || req.path;
    
    // Skip for some standard routes
    if (path.includes('/auth/login') || path.includes('/auth/refresh')) {
      next();
      return;
    }
    
    // Determine permission key based on route (simplified example)
    // In a real app, this would use a more sophisticated mapping
    const resource = path.split('/')[1] || 'unknown';
    const permissionKey = `${resource}:${method}`;
    
    // Get user ID
    const userId = req.user['id'];
    
    try {
      // Check if user has permission
      const hasPermission = await this.checkPermission(userId, permissionKey);
      
      if (hasPermission) {
        // Log successful permission check
        this.logger.debug(`User ${userId} granted permission ${permissionKey}`);
        next();
      } else {
        // Log denied permission
        this.logger.warn(`User ${userId} denied permission ${permissionKey}`);
        throw new ForbiddenException(`Insufficient permissions for ${permissionKey}`);
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error in permission middleware: ${error.message}`);
      throw new ForbiddenException('Error checking permissions');
    }
  }
} 