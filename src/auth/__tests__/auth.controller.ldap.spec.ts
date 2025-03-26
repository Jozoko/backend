import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { LdapService } from '../services/ldap.service';
import { LoginDto } from '../dto/login.dto';

describe('AuthController - LDAP Authentication', () => {
  let controller: AuthController;
  let authService: AuthService;
  let ldapService: LdapService;

  const mockUser = {
    id: 'ldap-user-123',
    username: 'ldapuser',
    displayName: 'LDAP User',
    email: 'ldap@example.com',
    roles: ['user'],
  };

  const mockAuthResponse = {
    success: true,
    token: {
      accessToken: 'mock-jwt-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
    userId: mockUser.id,
    username: mockUser.username,
    displayName: mockUser.displayName,
    email: mockUser.email,
    roles: mockUser.roles,
  };

  const mockLdapConfiguration = {
    id: 'ldap-config-123',
    name: 'Test LDAP Server',
    host: 'ldap.example.com',
    port: 389,
    bindDN: 'cn=admin,dc=example,dc=com',
    bindCredentials: 'admin-password',
    baseDN: 'ou=users,dc=example,dc=com',
    searchFilter: '(uid={{username}})',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            generateAuthResponse: jest.fn().mockReturnValue(mockAuthResponse),
          },
        },
        {
          provide: LdapService,
          useValue: {
            getAllConfigurations: jest.fn().mockResolvedValue([mockLdapConfiguration]),
            getConfigurationById: jest.fn().mockResolvedValue(mockLdapConfiguration),
            createConfiguration: jest.fn().mockResolvedValue(mockLdapConfiguration),
            updateConfiguration: jest.fn().mockResolvedValue(mockLdapConfiguration),
            deleteConfiguration: jest.fn().mockResolvedValue(true),
            testConnection: jest.fn().mockResolvedValue({ success: true, message: 'Connection successful' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    ldapService = module.get<LdapService>(LdapService);
  });

  describe('ldapLogin', () => {
    it('should return authentication response for LDAP login', async () => {
      const loginDto = new LoginDto();
      loginDto.username = 'ldapuser';
      loginDto.password = 'password123';
      
      // Create mock request with user (simulating guard's effect)
      const req = { user: mockUser };

      const result = await controller.ldapLogin(loginDto, req);

      expect(authService.generateAuthResponse).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('LDAP Configuration Endpoints', () => {
    it('should get all LDAP configurations', async () => {
      const result = await controller.getAllLdapConfigurations();
      
      expect(ldapService.getAllConfigurations).toHaveBeenCalled();
      expect(result).toEqual([mockLdapConfiguration]);
    });

    it('should get LDAP configuration by ID', async () => {
      const result = await controller.getLdapConfiguration('ldap-config-123');
      
      expect(ldapService.getConfigurationById).toHaveBeenCalledWith('ldap-config-123');
      expect(result).toEqual(mockLdapConfiguration);
    });

    it('should create LDAP configuration', async () => {
      const createDto = {
        name: 'New LDAP Server',
        host: 'new-ldap.example.com',
        port: 389,
        bindDN: 'cn=admin,dc=example,dc=com',
        bindCredentials: 'admin-password',
        baseDN: 'ou=users,dc=example,dc=com',
        searchFilter: '(uid={{username}})',
      };
      
      await controller.createLdapConfiguration(createDto);
      
      expect(ldapService.createConfiguration).toHaveBeenCalledWith(createDto);
    });

    it('should update LDAP configuration', async () => {
      const updateDto = {
        name: 'Updated LDAP Server',
      };
      
      await controller.updateLdapConfiguration('ldap-config-123', updateDto);
      
      expect(ldapService.updateConfiguration).toHaveBeenCalledWith('ldap-config-123', updateDto);
    });

    it('should delete LDAP configuration', async () => {
      const result = await controller.deleteLdapConfiguration('ldap-config-123');
      
      expect(ldapService.deleteConfiguration).toHaveBeenCalledWith('ldap-config-123');
      expect(result).toEqual({ success: true });
    });

    it('should test LDAP connection', async () => {
      const result = await controller.testLdapConnection('ldap-config-123');
      
      expect(ldapService.testConnection).toHaveBeenCalledWith('ldap-config-123');
      expect(result).toEqual({ success: true, message: 'Connection successful' });
    });
  });
}); 