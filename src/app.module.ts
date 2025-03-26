import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database.module';
import { LoggingModule } from './config/logging.module';
import { RedisModule } from './config/redis.module';
import { DatabaseConfigModule } from './config/database-config.module';
import { CommonModule } from './common/common.module';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Core infrastructure modules
    ConfigModule,
    LoggingModule,
    DatabaseModule,
    RedisModule,
    DatabaseConfigModule,
    
    // Application modules
    CommonModule,
    TasksModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
