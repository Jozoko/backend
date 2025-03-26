import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LdapService } from './ldap.service';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto, AuthTokenDto, TokenRefreshDto, TokenRefreshResponseDto } from '../dto';
import { LoginValidationService } from './login-validation.service';
import * as bcrypt from 'bcrypt';

interface TokenPayload {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  type?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly adminUsername: string | undefined;
  private readonly adminPasswordHash: string | undefined;
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly refreshTokenExpiration: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private ldapService: LdapService,
    private loginValidationService: LoginValidationService,
  ) {
    // Get admin credentials from environment variables
    this.adminUsername = this.configService.get<string>('ADMIN_USERNAME');
    this.adminPasswordHash = this.configService.get<string>('ADMIN_PASSWORD_HASH');
    
    // Get JWT configuration
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || 'SOME-VERY-LONG-SECRET-AND-RANDOM';
    this.jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || `${this.jwtSecret}-refresh`;
    this.refreshTokenExpiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
  }

  /**
   * Validate user credentials (used by local strategy)
   */
  async validateUser(username: string, password: string): Promise<any> {
    try {
      // Check if this is the admin user
      if (username === this.adminUsername) {
        const isValid = await bcrypt.compare(password, this.adminPasswordHash);
        if (isValid) {
          return {
            id: 'admin',
            username: this.adminUsername,
            displayName: 'Administrator',
            email: 'admin@example.com',
            roles: ['admin'],
          };
        }
        return null;
      }
      
      // Otherwise validate against LDAP
      return this.ldapService.validateUser(username, password);
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`);
      return null;
    }
  }

  /**
   * Login user and generate JWT token
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      // Validate login credentials for security threats
      const validationResult = this.loginValidationService.validateLoginCredentials(loginDto);
      if (!validationResult.isValid) {
        // Log potential security threats but don't reveal specific reasons
        this.logger.warn(`Login validation failed: ${validationResult.securityWarnings.join(', ')}`);
        throw new BadRequestException('Invalid login request');
      }

      const user = await this.validateUser(
        loginDto.username,
        loginDto.password,
      );

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.generateAuthResponse(user);
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate authentication response with JWT token
   */
  generateAuthResponse(user: any): AuthResponseDto {
    // Generate JWT token
    const token = this.generateToken(user);

    return {
      success: true,
      token,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      roles: user.roles,
    };
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: any): AuthTokenDto {
    const accessTokenPayload: TokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      type: 'access',
    };

    const refreshTokenPayload: TokenPayload = {
      ...accessTokenPayload,
      type: 'refresh',
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRATION', '1h');
    const expiresInSeconds = this.getExpirationInSeconds(expiresIn);

    // Create access token
    const accessToken = this.jwtService.sign(accessTokenPayload, {
      secret: this.jwtSecret,
      expiresIn: expiresIn,
    });

    // Create refresh token
    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.refreshTokenExpiration,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refreshToken(refreshDto: TokenRefreshDto): Promise<TokenRefreshResponseDto> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify(refreshDto.refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      // Ensure it's a refresh token
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Create a new access token
      const accessTokenPayload: TokenPayload = {
        sub: payload.sub,
        username: payload.username,
        email: payload.email,
        roles: payload.roles,
        type: 'access',
      };

      const expiresIn = this.configService.get<string>('JWT_EXPIRATION', '1h');
      const expiresInSeconds = this.getExpirationInSeconds(expiresIn);

      // Create a new access token
      const accessToken = this.jwtService.sign(accessTokenPayload, {
        secret: this.jwtSecret,
        expiresIn: expiresIn,
      });

      // Determine if we should rotate refresh tokens
      const shouldRotateRefreshTokens = this.configService.get<boolean>('JWT_REFRESH_ROTATION', false);
      let newRefreshToken: string | undefined = undefined;

      if (shouldRotateRefreshTokens) {
        const refreshTokenPayload: TokenPayload = {
          ...accessTokenPayload,
          type: 'refresh',
        };

        newRefreshToken = this.jwtService.sign(refreshTokenPayload, {
          secret: this.jwtRefreshSecret,
          expiresIn: this.refreshTokenExpiration,
        });
      }

      return {
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn: expiresInSeconds,
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Get token expiration in seconds
   */
  private getExpirationInSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 3600;
    }
  }
} 