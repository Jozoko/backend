import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { CommonModule } from '../common/common.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    RolesModule,
    CommonModule,
    ConfigModule,
  ],
  controllers: [AdminController],
  providers: [],
})
export class AdminModule {} 