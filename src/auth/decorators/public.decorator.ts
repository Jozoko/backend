import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Interface for routes that are marked as public
 * Public routes bypass authentication and authorization checks
 */
export interface IsPublic {
  isPublic: boolean;
}

/**
 * Decorator to mark routes as public
 * Public routes bypass authentication and authorization checks
 * @returns Decorator function
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true); 