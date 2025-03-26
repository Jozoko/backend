import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities';
import { SystemController } from './controllers/system.controller';
import { 
  CacheService,
  HelperService,
  AuditService 
} from './services';
import { HttpExceptionFilter } from './filters';
import { LoggingInterceptor } from './interceptors';
import { RateLimitGuard } from './guards';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    TasksModule,
  ],
  controllers: [SystemController],
  providers: [
    // Services
    CacheService,
    HelperService,
    AuditService,
    
    // Guards
    RateLimitGuard,
    
    // Filters
    HttpExceptionFilter,
    
    // Interceptors
    LoggingInterceptor,
  ],
  exports: [
    // Services
    CacheService,
    HelperService,
    AuditService,
    
    // Guards
    RateLimitGuard,
    
    // Filters
    HttpExceptionFilter,
    
    // Interceptors
    LoggingInterceptor,
  ],
})
export class CommonModule {} 