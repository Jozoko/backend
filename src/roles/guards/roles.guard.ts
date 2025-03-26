import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../services/roles.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
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

    // Get the required roles from the route handler
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If there's no user (not authenticated), deny access
    if (!user) {
      this.logger.warn('User not authenticated when accessing route with role requirements');
      throw new UnauthorizedException('Authentication required');
    }

    // Get the user's roles
    try {
      const userRoles = await this.rolesService.getRolesByUserId(user.id);
      
      // Check if the user has any of the required roles
      const hasRequiredRole = userRoles.some(userRole => 
        requiredRoles.includes(userRole.name)
      );

      if (!hasRequiredRole) {
        this.logger.warn(`User ${user.id} attempted to access route requiring roles: ${requiredRoles.join(', ')}`);
        throw new ForbiddenException('Insufficient role permissions');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Error checking roles for user ${user.id}: ${error.message}`);
      throw new ForbiddenException('Error checking role permissions');
    }
  }
} 