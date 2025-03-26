import { applyDecorators, UseGuards as NestUseGuards } from '@nestjs/common';

/**
 * Apply multiple custom guards to a route handler or controller
 * This is separate from NestJS's UseGuards to avoid conflicts
 * @param guards Array of guard classes
 */
export function UseGuards(...guards: any[]) {
  return applyDecorators(
    NestUseGuards(...guards)
  );
} 