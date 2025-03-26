import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Interface for routes that require specific permissions
 */
export interface RequiresPermissions {
  permissions: string[];
}

/**
 * Decorator to specify required permissions for a route
 * @param permissions Array of permission keys required to access the route
 * @returns Decorator function
 */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions); 