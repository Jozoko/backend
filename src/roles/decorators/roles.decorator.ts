import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Interface for routes that require specific roles
 */
export interface RequiresRoles {
  roles: string[];
}

/**
 * Decorator to specify required roles for a route
 * @param roles Array of role names required to access the route
 * @returns Decorator function
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles); 