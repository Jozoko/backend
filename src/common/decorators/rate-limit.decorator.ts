import { SetMetadata } from '@nestjs/common';

/**
 * Set rate limit for route
 * @param limit Maximum number of requests
 * @param ttl Time to live in seconds
 */
export function RateLimit(limit: number, ttl: number = 60) {
  return function(target: any, key: string, descriptor: PropertyDescriptor) {
    SetMetadata('rateLimit', limit)(target, key, descriptor);
    SetMetadata('rateLimitTtl', ttl)(target, key, descriptor);
    return descriptor;
  };
} 