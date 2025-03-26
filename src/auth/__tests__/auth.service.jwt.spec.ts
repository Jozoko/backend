import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LdapService } from '../services/ldap.service';
import { TokenRefreshDto } from '../dto';

describe('AuthService - JWT Authentication', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockImplementation((payload, options) => {
              // Create a simple mock token with type and expiration for testing
              return `mock-${payload.type}-token`;
            }),
            verify: jest.fn().mockImplementation((token, options) => {
              if (token === 'mock-refresh-token') {
                return {
                  sub: 'user-123',
                  username: 'testuser',
                  email: 'test@example.com',
                  roles: ['user'],
                  type: 'refresh',
                  iat: Math.floor(Date.now() / 1000),
                  exp: Math.floor(Date.now() / 1000) + 3600,
                };
              } else if (token === 'mock-invalid-token') {
                throw new Error('Invalid token');
              } else if (token === 'mock-wrong-type-token') {
                return {
                  sub: 'user-123',
                  username: 'testuser',
                  email: 'test@example.com',
                  roles: ['user'],
                  type: 'access', // Wrong type for refresh
                  iat: Math.floor(Date.now() / 1000),
                  exp: Math.floor(Date.now() / 1000) + 3600,
                };
              }
              throw new Error('Token not recognized in test');
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              const values = {
                'JWT_SECRET': 'test-secret',
                'JWT_REFRESH_SECRET': 'test-refresh-secret',
                'JWT_EXPIRATION': '1h',
                'JWT_REFRESH_EXPIRATION': '7d',
                'JWT_REFRESH_ROTATION': true,
              };
              return values[key] || defaultValue;
            }),
          },
        },
        {
          provide: LdapService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('generateToken', () => {
    it('should generate JWT tokens with proper payload', () => {
      const authResponse = service.generateAuthResponse(mockUser);

      expect(authResponse.success).toBeTruthy();
      expect(authResponse.token.accessToken).toBe('mock-access-token');
      expect(authResponse.token.refreshToken).toBe('mock-refresh-token');
      expect(authResponse.token.tokenType).toBe('Bearer');
      expect(authResponse.token.expiresIn).toBe(3600); // 1h in seconds

      // Verify user properties are passed through
      expect(authResponse.userId).toBe(mockUser.id);
      expect(authResponse.username).toBe(mockUser.username);
      expect(authResponse.displayName).toBe(mockUser.displayName);
      expect(authResponse.email).toBe(mockUser.email);
      expect(authResponse.roles).toEqual(mockUser.roles);

      // Verify sign was called with the right parameters
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign.mock.calls[0][0]).toMatchObject({
        sub: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        roles: mockUser.roles,
        type: 'access',
      });
      expect(jwtService.sign.mock.calls[1][0]).toMatchObject({
        sub: mockUser.id,
        username: mockUser.username,
        email: mockUser.email,
        roles: mockUser.roles,
        type: 'refresh',
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshDto = new TokenRefreshDto();
      refreshDto.refreshToken = 'mock-refresh-token';

      const result = await service.refreshToken(refreshDto);

      expect(result.success).toBeTruthy();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token'); // For rotation enabled
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600);

      // Verify the token was verified with the right secret
      expect(jwtService.verify).toHaveBeenCalledWith('mock-refresh-token', {
        secret: 'test-refresh-secret',
      });

      // Verify sign was called for the new access token
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          roles: ['user'],
          type: 'access',
        }),
        expect.any(Object)
      );
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshDto = new TokenRefreshDto();
      refreshDto.refreshToken = 'mock-invalid-token';

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.verify).toHaveBeenCalledWith('mock-invalid-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException for wrong token type', async () => {
      const refreshDto = new TokenRefreshDto();
      refreshDto.refreshToken = 'mock-wrong-type-token';

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.verify).toHaveBeenCalledWith('mock-wrong-type-token', {
        secret: 'test-refresh-secret',
      });
    });

    it('should handle token refresh without rotation', async () => {
      // Mock the config service to disable refresh token rotation
      jest.spyOn(configService, 'get').mockImplementation((key, defaultValue) => {
        if (key === 'JWT_REFRESH_ROTATION') return false;
        
        const values = {
          'JWT_SECRET': 'test-secret',
          'JWT_REFRESH_SECRET': 'test-refresh-secret',
          'JWT_EXPIRATION': '1h',
          'JWT_REFRESH_EXPIRATION': '7d',
        };
        return values[key] || defaultValue;
      });

      const refreshDto = new TokenRefreshDto();
      refreshDto.refreshToken = 'mock-refresh-token';

      const result = await service.refreshToken(refreshDto);

      expect(result.success).toBeTruthy();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeUndefined(); // No new refresh token when rotation is disabled
      expect(result.tokenType).toBe('Bearer');
    });
  });
}); 