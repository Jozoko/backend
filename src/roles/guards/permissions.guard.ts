import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../services/permissions.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { RolesService } from '../services/roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly permissionsService: PermissionsService,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get the required permissions from the route handler
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If there's no user (not authenticated), deny access
    if (!user) {
      this.logger.warn('User not authenticated when accessing route with permission requirements');
      throw new UnauthorizedException('Authentication required');
    }

    try {
      // Get the user's roles
      const userRoles = await this.rolesService.getRolesByUserId(user.id);
      
      // Check each role for the required permissions
      for (const role of userRoles) {
        // Get permissions for this role
        const rolePermissions = await this.permissionsService.getPermissionsByRoleId(role.id);
        
        // Create a map of permissions by "resource:action" format
        const permissionMap = new Map<string, boolean>();
        rolePermissions.forEach(permission => {
          const key = `${permission.resource}:${permission.action}`;
          permissionMap.set(key, true);
        });
        
        // Check if the user has any of the required permissions
        const hasRequiredPermission = requiredPermissions.some(requiredPerm => 
          permissionMap.has(requiredPerm)
        );
        
        if (hasRequiredPermission) {
          return true;
        }
      }
      
      // If we get here, the user doesn't have any of the required permissions
      this.logger.warn(`User ${user.id} attempted to access route requiring permissions: ${requiredPermissions.join(', ')}`);
      throw new ForbiddenException('Insufficient permissions');
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error checking permissions for user ${user.id}: ${error.message}`);
      throw new ForbiddenException('Error checking permissions');
    }
  }
} 