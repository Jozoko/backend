import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ThrottlerException } from '@nestjs/throttler';

interface RateLimitStorage {
  [key: string]: {
    timestamp: number;
    count: number;
  };
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private storage: RateLimitStorage = {};

  // Default limits
  private readonly defaultLimit = 100; // requests
  private readonly defaultTtl = 60; // seconds

  constructor(private reflector: Reflector) {
    // Clean up old entries every minute
    setInterval(() => this.cleanupStorage(), 60 * 1000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Get custom limits if set with @RateLimit decorator
    const limit = this.reflector.get<number>('rateLimit', context.getHandler()) || this.defaultLimit;
    const ttl = this.reflector.get<number>('rateLimitTtl', context.getHandler()) || this.defaultTtl;
    
    // Skip rate limiting for local development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    const key = this.generateKey(request);
    
    if (!this.storage[key]) {
      this.storage[key] = {
        timestamp: Date.now(),
        count: 0,
      };
    }
    
    const record = this.storage[key];
    const ttlMs = ttl * 1000;
    
    // Reset count if TTL has passed
    if (Date.now() - record.timestamp > ttlMs) {
      record.timestamp = Date.now();
      record.count = 0;
    }
    
    // Check if limit is exceeded
    if (record.count >= limit) {
      this.logger.warn(`Rate limit exceeded for ${key}`);
      throw new ThrottlerException('Too many requests');
    }
    
    // Increment request count
    record.count++;
    
    return true;
  }
  
  private generateKey(request: Request): string {
    const ip = request.ip || '0.0.0.0';
    const path = request.path;
    return `${ip}:${path}`;
  }
  
  private cleanupStorage(): void {
    const now = Date.now();
    
    // Remove entries older than 1 hour
    Object.keys(this.storage).forEach(key => {
      if (now - this.storage[key].timestamp > 3600 * 1000) {
        delete this.storage[key];
      }
    });
  }
} 