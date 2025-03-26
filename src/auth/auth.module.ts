import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LdapConfiguration } from './entities';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { LdapStrategy } from './strategies/ldap.strategy';
import { AuthController } from './controllers/auth.controller';
import { LdapService } from './services/ldap.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LdapAuthGuard } from './guards/ldap-auth.guard';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LdapConfiguration]),
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
  controllers: [AuthController],
  providers: [
    // Services
    AuthService,
    LdapService,
    
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
    AuthService,
    LdapService,
    JwtAuthGuard,
    LdapAuthGuard,
  ],
})
export class AuthModule {} 