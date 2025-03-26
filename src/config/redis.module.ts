import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisClientOptions } from 'redis';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    // Bull Queue Module
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return {
          redis: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password || undefined,
            tls: redisConfig.tls,
          },
          defaultJobOptions: {
            attempts: 3,
            removeOnComplete: true,
            removeOnFail: false,
          },
        };
      },
    }),
    
    // Cache Module
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        
        // Store options
        const storeOptions: any = {
          socket: {
            host: redisConfig.host,
            port: redisConfig.port,
          },
          password: redisConfig.password || undefined,
          ttl: redisConfig.defaultTTL * 1000, // Convert to milliseconds
        };
        
        // If URL is provided, use it instead
        if (redisConfig.url) {
          storeOptions.url = redisConfig.url;
          delete storeOptions.socket; // Remove socket when using URL
        }
        
        // If TLS is required
        if (redisConfig.tls) {
          if (storeOptions.socket) {
            storeOptions.socket.tls = true;
          } else {
            // When using URL with TLS
            storeOptions.tls = true;
          }
        }
        
        return {
          store: redisStore as unknown as any,
          ...storeOptions,
        };
      },
    }),
  ],
  exports: [BullModule, CacheModule],
})
export class RedisModule {} 