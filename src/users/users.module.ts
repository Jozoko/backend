import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserLdapDetails, UserPreferences } from './entities';
import { UserService } from './services/user.service';
import { ProfileService } from './services/profile.service';
import { UserController } from './controllers/user.controller';
import { ProfileController } from './controllers/profile.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserLdapDetails, UserPreferences]),
    CommonModule,
  ],
  controllers: [UserController, ProfileController],
  providers: [UserService, ProfileService],
  exports: [UserService, ProfileService],
})
export class UsersModule {} 