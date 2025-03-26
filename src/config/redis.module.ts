import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return {
          redis: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
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
  ],
  exports: [BullModule],
})
export class RedisModule {} 