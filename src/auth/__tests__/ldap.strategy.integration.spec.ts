import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LdapStrategy } from '../strategies/ldap.strategy';
import { LdapService } from '../services/ldap.service';
import { LdapConfiguration } from '../entities';
import { UserService } from '../../users/services/user.service';
import { User, UserLdapDetails } from '../../users/entities';
import { AuditService } from '../../common/services/audit.service';
import * as fs from 'fs';

// Mock fs.readFileSync to prevent actual file reading
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'mock-certificate-content'),
  accessSync: jest.fn(),
  constants: { R_OK: 4 },
}));

describe('LdapStrategy Integration', () => {
  let strategy: LdapStrategy;
  let ldapService: LdapService;
  let userService: UserService;
  let ldapConfigRepository: Repository<LdapConfiguration>;
  let userRepository: Repository<User>;
  let userLdapDetailsRepository: Repository<UserLdapDetails>;

  const mockLdapConfig = {
    id: 'test-config-id',
    name: 'Test LDAP',
    host: 'ldap.example.com',
    port: 389,
    bindDN: 'cn=admin,dc=example,dc=com',
    bindCredentials: 'admin-password',
    baseDN: 'ou=users,dc=example,dc=com',
    searchFilter: '(uid={{username}})',
    isActive: true,
    useTLS: false,
    isDefault: true,
    description: 'Test LDAP config',
    attributes: {},
    syncSchedule: '0 0 * * *',
  };

  const mockLdapUser = {
    dn: 'uid=testuser,ou=users,dc=example,dc=com',
    uid: 'testuser',
    cn: 'Test User',
    mail: 'test@example.com',
    objectGUID: 'test-guid-123',
    memberOf: ['cn=users,ou=groups,dc=example,dc=com'],
  };

  const mockMappedUser = {
    id: 'test-guid-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    ldapDn: 'uid=testuser,ou=users,dc=example,dc=com',
    roles: ['user'],
  };

  beforeEach(async () => {
    // Clear all mocks between tests
    jest.clearAllMocks();
    
    // Create a testing module with mocked repositories
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
      ],
      providers: [
        LdapStrategy,
        LdapService,
        UserService,
        AuditService,
        ConfigService,
        {
          provide: getRepositoryToken(LdapConfiguration),
          useValue: {
            findOneBy: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserLdapDetails),
          useValue: {
            findOneBy: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    // Get necessary services
    strategy = module.get<LdapStrategy>(LdapStrategy);
    ldapService = module.get<LdapService>(LdapService);
    userService = module.get<UserService>(UserService);
    ldapConfigRepository = module.get(getRepositoryToken(LdapConfiguration));
    userRepository = module.get(getRepositoryToken(User));
    userLdapDetailsRepository = module.get(getRepositoryToken(UserLdapDetails));

    // Setup LdapService mock methods
    jest.spyOn(ldapService, 'mapLdapUser').mockReturnValue(mockMappedUser);
    jest.spyOn(ldapService, 'getDefaultConfiguration').mockResolvedValue(mockLdapConfig as any);
    jest.spyOn(ldapService, 'getConfigurationById').mockResolvedValue(mockLdapConfig as any);

    // Setup UserService mock methods
    jest.spyOn(userService, 'createOrUpdateFromLdap').mockImplementation(async (ldapUser, configId) => {
      // Create a new user object to return
      const user = new User();
      user.id = 'generated-user-id';
      user.username = ldapUser.username;
      user.displayName = ldapUser.displayName;
      user.email = ldapUser.email;
      user.ldapConfigurationId = configId;
      return user;
    });
  });

  describe('validate', () => {
    it('should integrate with userService to create/update user on successful authentication', async () => {
      // Setup request with LDAP config
      const req: any = { _ldapConfig: mockLdapConfig };

      // Validate the LDAP user
      const result = await strategy.validate(req, mockLdapUser);

      // Verify mappedUser is returned from ldapService
      expect(ldapService.mapLdapUser).toHaveBeenCalledWith(mockLdapUser, mockLdapConfig);

      // Verify user creation/update is called with correct parameters
      expect(userService.createOrUpdateFromLdap).toHaveBeenCalledWith(
        mockMappedUser,
        mockLdapConfig.id
      );

      // Verify the returned user is properly constructed from both services
      expect(result).toMatchObject({
        username: mockMappedUser.username,
        displayName: mockMappedUser.displayName,
        email: mockMappedUser.email,
      });
    });

    it('should throw UnauthorizedException when LDAP user is null', async () => {
      // Setup request with LDAP config
      const req: any = { _ldapConfig: mockLdapConfig };

      // Attempt to validate null user and expect exception
      await expect(strategy.validate(req, null)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when LDAP configuration is missing', async () => {
      // Setup request without LDAP config
      const req: any = { };

      // Attempt to validate and expect exception
      await expect(strategy.validate(req, mockLdapUser)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle errors during user creation gracefully', async () => {
      // Setup request with LDAP config
      const req: any = { _ldapConfig: mockLdapConfig };

      // Make userService.createOrUpdateFromLdap throw an error
      jest.spyOn(userService, 'createOrUpdateFromLdap').mockRejectedValue(new Error('Database error'));

      // Attempt to validate and expect exception
      await expect(strategy.validate(req, mockLdapUser)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('end-to-end authentication flow', () => {
    it('should handle the complete authentication flow from strategy to user creation', async () => {
      // Setup necessary mocks
      const superAuthenticateMock = jest.fn();
      const originalAuthenticate = Object.getPrototypeOf(strategy).authenticate;
      Object.getPrototypeOf(strategy).authenticate = superAuthenticateMock;

      // Create a mock request with LDAP config ID
      const req: any = { body: { username: 'testuser', password: 'password123', ldapConfigurationId: 'test-config-id' } };
      const options = {};

      // Call the authenticate method
      strategy.authenticate(req, options);

      // Wait for promises to resolve
      await new Promise(process.nextTick);

      // Verify LDAP configuration was retrieved
      expect(ldapService.getConfigurationById).toHaveBeenCalledWith('test-config-id');
      expect(req._ldapConfig).toBe(mockLdapConfig);

      // Simulate successful authentication by calling validate directly
      const user = await strategy.validate(req, mockLdapUser);

      // Verify user was mapped and created/updated
      expect(ldapService.mapLdapUser).toHaveBeenCalledWith(mockLdapUser, mockLdapConfig);
      expect(userService.createOrUpdateFromLdap).toHaveBeenCalledWith(mockMappedUser, mockLdapConfig.id);

      // Verify the user object is correct
      expect(user).toBeDefined();
      expect(user.username).toBe(mockMappedUser.username);

      // Restore original authenticate method
      Object.getPrototypeOf(strategy).authenticate = originalAuthenticate;
    });
  });
}); 