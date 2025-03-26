import { Module } from '@nestjs/common';
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
import { CommonModule } from '../common/common.module';
import { forwardRef } from '@nestjs/common';
import { UsersModule } from '../users/users.module';

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
  ],
  exports: [
    RolesService,
    PermissionsService,
    RolesGuard,
  ],
})
export class RolesModule {} 