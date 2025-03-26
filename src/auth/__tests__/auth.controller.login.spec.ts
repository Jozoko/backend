import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { LdapService } from '../services/ldap.service';
import { LoginValidationService } from '../services/login-validation.service';
import { LoginDto } from '../dto/login.dto';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('AuthController - Login Validation', () => {
  let controller: AuthController;
  let authService: AuthService;
  let loginValidationService: LoginValidationService;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    roles: ['user'],
  };

  const mockAuthResponse = {
    success: true,
    token: {
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
    userId: mockUser.id,
    username: mockUser.username,
    displayName: mockUser.displayName,
    email: mockUser.email,
    roles: mockUser.roles,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            generateAuthResponse: jest.fn().mockReturnValue(mockAuthResponse),
            validateUser: jest.fn(),
          },
        },
        {
          provide: LdapService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
        {
          provide: LoginValidationService,
          useValue: {
            validateLoginCredentials: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    loginValidationService = module.get<LoginValidationService>(LoginValidationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return authentication response when login succeeds', async () => {
      // Arrange
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'Password123!',
      };
      
      const req = { user: mockUser };
      
      // Act
      const result = await controller.login(loginDto, req);
      
      // Assert
      expect(result).toBe(mockAuthResponse);
      expect(authService.generateAuthResponse).toHaveBeenCalledWith(mockUser);
    });

    it('should handle unauthorized exception', async () => {
      // Arrange
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'wrong-password',
      };
      
      const req = {}; // No user = auth failed
      
      // Mock the service to throw exception
      jest.spyOn(authService, 'generateAuthResponse').mockImplementation(() => {
        throw new UnauthorizedException('Invalid credentials');
      });
      
      // Act & Assert
      await expect(controller.login(loginDto, req)).rejects.toThrow('Authentication failed');
    });
  });

  describe('ldapLogin', () => {
    it('should return authentication response when LDAP login succeeds', async () => {
      // Arrange
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'Password123!',
        ldapConfigurationId: 'ldap-config-id',
      };
      
      const req = { user: mockUser };
      
      // Act
      const result = await controller.ldapLogin(loginDto, req);
      
      // Assert
      expect(result).toBe(mockAuthResponse);
      expect(authService.generateAuthResponse).toHaveBeenCalledWith(mockUser);
    });

    it('should handle unauthorized exception in LDAP login', async () => {
      // Arrange
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'wrong-password',
        ldapConfigurationId: 'ldap-config-id',
      };
      
      const req = {}; // No user = auth failed
      
      // Mock the service to throw exception
      jest.spyOn(authService, 'generateAuthResponse').mockImplementation(() => {
        throw new UnauthorizedException('Invalid LDAP credentials');
      });
      
      // Act & Assert
      await expect(controller.ldapLogin(loginDto, req)).rejects.toThrow('Authentication failed');
    });
  });
}); 