import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LdapService } from '../services/ldap.service';
import { LoginDto } from '../dto/login.dto';

describe('AuthService - LDAP Authentication', () => {
  let service: AuthService;
  let ldapService: LdapService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockLdapUser = {
    id: 'ldap-user-123',
    username: 'ldapuser',
    displayName: 'LDAP User',
    email: 'ldap@example.com',
    roles: ['user'],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              const values = {
                'ADMIN_USERNAME': 'admin',
                'ADMIN_PASSWORD_HASH': '$2b$10$X3nDPPf6hNq/cXYQOvAfWOPhyMLOZ04PfBBDuaUjzxFKSPJRGKpLy', // hash for 'admin123'
                'JWT_EXPIRATION': '1h',
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
    ldapService = module.get<LdapService>(LdapService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validateUser', () => {
    it('should validate LDAP user credentials', async () => {
      // Set up LDAP service to return a user
      jest.spyOn(ldapService, 'validateUser').mockResolvedValue(mockLdapUser);

      const result = await service.validateUser('ldapuser', 'password123');

      expect(ldapService.validateUser).toHaveBeenCalledWith('ldapuser', 'password123');
      expect(result).toEqual(mockLdapUser);
    });

    it('should return null when LDAP validation fails', async () => {
      // Set up LDAP service to return null
      jest.spyOn(ldapService, 'validateUser').mockResolvedValue(null);

      const result = await service.validateUser('ldapuser', 'wrong-password');

      expect(ldapService.validateUser).toHaveBeenCalledWith('ldapuser', 'wrong-password');
      expect(result).toBeNull();
    });

    it('should handle LDAP validation errors', async () => {
      // Set up LDAP service to throw an error
      jest.spyOn(ldapService, 'validateUser').mockRejectedValue(new Error('LDAP error'));

      const result = await service.validateUser('ldapuser', 'password123');

      expect(ldapService.validateUser).toHaveBeenCalledWith('ldapuser', 'password123');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should login LDAP user and return auth response', async () => {
      // Mock the validateUser method to return a user
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockLdapUser);
      
      // Mock the generateAuthResponse method
      jest.spyOn(service, 'generateAuthResponse').mockReturnValue({
        success: true,
        token: {
          accessToken: 'mock-jwt-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
        },
        userId: mockLdapUser.id,
        username: mockLdapUser.username,
        displayName: mockLdapUser.displayName,
        email: mockLdapUser.email,
        roles: mockLdapUser.roles,
      });

      const loginDto = new LoginDto();
      loginDto.username = 'ldapuser';
      loginDto.password = 'password123';

      const result = await service.login(loginDto);

      expect(service.validateUser).toHaveBeenCalledWith('ldapuser', 'password123');
      expect(service.generateAuthResponse).toHaveBeenCalledWith(mockLdapUser);
      expect(result.success).toBe(true);
      expect(result.token.accessToken).toBe('mock-jwt-token');
      expect(result.username).toBe(mockLdapUser.username);
    });

    it('should throw UnauthorizedException when login fails', async () => {
      // Mock the validateUser method to return null
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      const loginDto = new LoginDto();
      loginDto.username = 'ldapuser';
      loginDto.password = 'wrong-password';

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(service.validateUser).toHaveBeenCalledWith('ldapuser', 'wrong-password');
    });
  });

  describe('generateAuthResponse', () => {
    it('should generate auth response with JWT token for LDAP user', () => {
      // Mock the generateToken method
      jest.spyOn(jwtService, 'sign').mockReturnValue('mock-jwt-token');

      const result = service.generateAuthResponse(mockLdapUser);

      expect(result.success).toBe(true);
      expect(result.token.accessToken).toBe('mock-jwt-token');
      expect(result.token.tokenType).toBe('Bearer');
      expect(result.userId).toBe(mockLdapUser.id);
      expect(result.username).toBe(mockLdapUser.username);
      expect(result.displayName).toBe(mockLdapUser.displayName);
      expect(result.email).toBe(mockLdapUser.email);
      expect(result.roles).toEqual(mockLdapUser.roles);
    });
  });
}); 