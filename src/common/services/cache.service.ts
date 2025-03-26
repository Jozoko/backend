import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl = 3600; // 1 hour in seconds

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl || this.defaultTtl);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}: ${error.message}`);
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}: ${error.message}`);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.reset();
    } catch (error) {
      this.logger.error(`Failed to clear cache: ${error.message}`);
    }
  }

  /**
   * Get multiple values from cache
   */
  async getMany<T>(keys: string[]): Promise<Record<string, T>> {
    try {
      const result: Record<string, T> = {};
      await Promise.all(
        keys.map(async (key) => {
          result[key] = await this.cacheManager.get<T>(key);
        }),
      );
      return result;
    } catch (error) {
      this.logger.error(`Failed to get many cache keys: ${error.message}`);
      return {};
    }
  }

  /**
   * Set multiple values in cache
   */
  async setMany<T>(entries: Record<string, T>, ttl?: number): Promise<void> {
    try {
      await Promise.all(
        Object.entries(entries).map(async ([key, value]) => {
          await this.cacheManager.set(key, value, ttl || this.defaultTtl);
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to set many cache keys: ${error.message}`);
    }
  }
} 