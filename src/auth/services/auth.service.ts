import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LdapService } from './ldap.service';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto, AuthTokenDto } from '../dto/auth-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly adminUsername: string | undefined;
  private readonly adminPasswordHash: string | undefined;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private ldapService: LdapService,
  ) {
    // Get admin credentials from environment variables
    this.adminUsername = this.configService.get<string>('ADMIN_USERNAME');
    this.adminPasswordHash = this.configService.get<string>('ADMIN_PASSWORD_HASH');
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
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRATION', '1h');
    const expiresInSeconds = this.getExpirationInSeconds(expiresIn);

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    };
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