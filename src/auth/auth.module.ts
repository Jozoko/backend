import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LdapConfiguration, LdapSyncConfig } from './entities';
import { AuthService } from './services/auth.service';
import { LoginValidationService } from './services/login-validation.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { LdapStrategy } from './strategies/ldap.strategy';
import { AuthController } from './controllers/auth.controller';
import { LdapService } from './services/ldap.service';
import { LdapSyncService } from './services/ldap-sync.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LdapAuthGuard } from './guards/ldap-auth.guard';
import { CommonModule } from '../common/common.module';
import { LdapSyncController } from './controllers/ldap-sync.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([LdapConfiguration, LdapSyncConfig]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
    CommonModule,
  ],
  controllers: [AuthController, LdapSyncController],
  providers: [
    // Services
    AuthService,
    LdapService,
    LdapSyncService,
    LoginValidationService,
    
    // Strategies
    JwtStrategy,
    LocalStrategy,
    LdapStrategy,
    
    // Guards
    JwtAuthGuard,
    LocalAuthGuard,
    LdapAuthGuard,
  ],
  exports: [
    // Services
    AuthService,
    LdapService,
    LdapSyncService,
    
    // Guards
    JwtAuthGuard,
    LocalAuthGuard,
    LdapAuthGuard,
    
    // Modules
    JwtModule,
  ],
})
export class AuthModule {} 