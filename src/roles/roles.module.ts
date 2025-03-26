import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
  Role, 
  Permission, 
  RolePermission, 
  UserRole, 
  LdapRoleMapping 
} from './entities';
import { RolesService } from './services/roles.service';
import { PermissionsService } from './services/permissions.service';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { RolesMappingController } from './controllers/roles-mapping.controller';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { PermissionCheckMiddleware } from './middleware/permission-check.middleware';
import { CommonModule } from '../common/common.module';
import { forwardRef } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Role, 
      Permission, 
      RolePermission, 
      UserRole, 
      LdapRoleMapping
    ]),
    CommonModule,
    forwardRef(() => UsersModule), // Avoid circular dependency
    forwardRef(() => AuthModule), // Import AuthModule for JWT service
  ],
  controllers: [
    RolesController,
    PermissionsController,
    RolesMappingController,
  ],
  providers: [
    RolesService,
    PermissionsService,
    RolesGuard,
    PermissionsGuard,
    PermissionCheckMiddleware,
  ],
  exports: [
    RolesService,
    PermissionsService,
    RolesGuard,
    PermissionsGuard,
    PermissionCheckMiddleware,
  ],
})
export class RolesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the permission check middleware to all routes
    // Optionally, you can exclude routes that don't need permission checking
    consumer
      .apply(PermissionCheckMiddleware)
      .exclude(
        'auth/login',
        'auth/refresh',
        'auth/logout'
      )
      .forRoutes('*');
  }
} 