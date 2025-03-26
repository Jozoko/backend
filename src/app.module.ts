import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database.module';
import { LoggingModule } from './config/logging.module';
import { RedisModule } from './config/redis.module';
import { DatabaseConfigModule } from './config/database-config.module';

@Module({
  imports: [
    // Core infrastructure modules
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    RedisModule,
    DatabaseConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
