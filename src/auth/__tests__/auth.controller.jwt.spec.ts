import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { LdapService } from '../services/ldap.service';
import { TokenRefreshDto, TokenRefreshResponseDto } from '../dto';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController - JWT Authentication', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockTokenResponse: TokenRefreshResponseDto = {
    success: true,
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            refreshToken: jest.fn().mockResolvedValue(mockTokenResponse),
            generateAuthResponse: jest.fn(),
          },
        },
        {
          provide: LdapService,
          useValue: {
            getAllConfigurations: jest.fn(),
            getConfigurationById: jest.fn(),
            createConfiguration: jest.fn(),
            updateConfiguration: jest.fn(),
            deleteConfiguration: jest.fn(),
            testConnection: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('refreshToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const refreshDto = new TokenRefreshDto();
      refreshDto.refreshToken = 'valid-refresh-token';

      const result = await controller.refreshToken(refreshDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshDto);
      expect(result).toEqual(mockTokenResponse);
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(3600);
    });

    it('should handle unauthorized exception for invalid refresh token', async () => {
      const refreshDto = new TokenRefreshDto();
      refreshDto.refreshToken = 'invalid-refresh-token';

      // Mock the service to throw an exception
      jest.spyOn(authService, 'refreshToken').mockRejectedValue(
        new UnauthorizedException('Invalid or expired refresh token')
      );

      await expect(controller.refreshToken(refreshDto)).rejects.toThrow(
        UnauthorizedException
      );
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshDto);
    });

    it('should handle refresh without token rotation', async () => {
      const refreshDto = new TokenRefreshDto();
      refreshDto.refreshToken = 'valid-refresh-token';

      // Mock a response without a refresh token (rotation disabled)
      const responseWithoutRotation = {
        ...mockTokenResponse,
        refreshToken: undefined,
      };
      jest.spyOn(authService, 'refreshToken').mockResolvedValue(responseWithoutRotation);

      const result = await controller.refreshToken(refreshDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshDto);
      expect(result).toEqual(responseWithoutRotation);
      expect(result.refreshToken).toBeUndefined();
    });
  });
}); 