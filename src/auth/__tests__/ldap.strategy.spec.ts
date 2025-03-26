import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LdapStrategy } from '../strategies/ldap.strategy';
import { LdapService } from '../services/ldap.service';
import * as fs from 'fs';

// Create a mock type for testing
interface MockLdapConfiguration {
  id: string;
  name: string;
  host: string;
  port: number;
  bindDN: string;
  bindCredentials: string;
  baseDN: string;
  searchFilter: string;
  isActive: boolean;
  useTLS: boolean;
  tlsCertPath?: string;
  usernameSuffix?: string;
  attributes?: Record<string, string>;
  description?: string;
  isDefault?: boolean;
}

// Mock fs.readFileSync to prevent actual file reading
jest.mock('fs', () => ({
  readFileSync: jest.fn(() => 'mock-certificate-content'),
}));

// Mock the entire LdapService to avoid TypeORM dependencies
jest.mock('../services/ldap.service');

describe('LdapStrategy', () => {
  let strategy: LdapStrategy;
  let ldapService: LdapService;

  const mockLdapConfig: MockLdapConfiguration = {
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
    isDefault: false,
    description: 'Test LDAP config',
    attributes: {},
  };

  const mockLdapUser = {
    dn: 'uid=testuser,ou=users,dc=example,dc=com',
    uid: 'testuser',
    cn: 'Test User',
    mail: 'test@example.com',
    memberOf: ['cn=users,ou=groups,dc=example,dc=com'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const mockLdapService = {
      getConfigurationById: jest.fn(),
      getDefaultConfiguration: jest.fn(),
      mapLdapUser: jest.fn(),
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LdapStrategy,
        {
          provide: LdapService,
          useValue: mockLdapService,
        },
      ],
    }).compile();

    strategy = module.get<LdapStrategy>(LdapStrategy);
    ldapService = module.get<LdapService>(LdapService);
  });

  describe('getLdapConfiguration', () => {
    it('should get configuration by ID when provided', async () => {
      jest.spyOn(ldapService, 'getConfigurationById').mockResolvedValue(mockLdapConfig as any);

      const result = await strategy.getLdapConfiguration('test-config-id');

      expect(ldapService.getConfigurationById).toHaveBeenCalledWith('test-config-id');
      expect(result.server.url).toBe('ldap://ldap.example.com:389');
      expect(result.server.bindDN).toBe(mockLdapConfig.bindDN);
      expect(result.server.bindCredentials).toBe(mockLdapConfig.bindCredentials);
      expect(result.server.searchBase).toBe(mockLdapConfig.baseDN);
      expect(result.server.searchFilter).toBe(mockLdapConfig.searchFilter);
    });

    it('should get default configuration when ID is not provided', async () => {
      jest.spyOn(ldapService, 'getDefaultConfiguration').mockResolvedValue(mockLdapConfig as any);

      const result = await strategy.getLdapConfiguration();

      expect(ldapService.getDefaultConfiguration).toHaveBeenCalled();
      expect(result.server.url).toBe('ldap://ldap.example.com:389');
    });

    it('should throw UnauthorizedException when configuration is inactive', async () => {
      const inactiveConfig = { ...mockLdapConfig, isActive: false };
      jest.spyOn(ldapService, 'getConfigurationById').mockResolvedValue(inactiveConfig as any);

      await expect(strategy.getLdapConfiguration('test-config-id')).rejects.toThrow(UnauthorizedException);
    });

    it('should configure TLS options when useTLS is true', async () => {
      const tlsConfig = { 
        ...mockLdapConfig, 
        useTLS: true, 
        tlsCertPath: '/path/to/cert.pem',
        port: 636
      };
      jest.spyOn(ldapService, 'getConfigurationById').mockResolvedValue(tlsConfig as any);

      const result = await strategy.getLdapConfiguration('test-config-id');

      expect(result.server.url).toBe('ldaps://ldap.example.com:636');
      expect(result.server.tlsOptions).toBeDefined();
      expect(result.server.tlsOptions.ca).toHaveLength(1);
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/cert.pem');
    });

    it('should add username suffix when configured', async () => {
      const suffixConfig = { 
        ...mockLdapConfig, 
        usernameSuffix: '@example.com'
      };
      jest.spyOn(ldapService, 'getConfigurationById').mockResolvedValue(suffixConfig as any);

      const result = await strategy.getLdapConfiguration('test-config-id');

      expect(result.server.usernameSuffix).toBe('@example.com');
    });
  });

  describe('authenticate', () => {
    it('should set server configuration dynamically and call parent authenticate', async () => {
      // Mock the getLdapConfiguration method
      jest.spyOn(strategy, 'getLdapConfiguration').mockResolvedValue({
        server: { url: 'ldap://example.com' },
        config: mockLdapConfig
      });

      // Mock the parent authenticate method
      const superAuthenticateMock = jest.fn();
      const originalAuthenticate = Object.getPrototypeOf(strategy).authenticate;
      Object.getPrototypeOf(strategy).authenticate = superAuthenticateMock;

      // Create a mock request with LDAP config ID in body
      const req: any = { body: { ldapConfigurationId: 'test-config-id' } };
      const options = {};

      // Call the method
      strategy.authenticate(req, options);

      // Wait for promises to resolve
      await new Promise(process.nextTick);

      // Verify the expected behavior
      expect(strategy.getLdapConfiguration).toHaveBeenCalledWith('test-config-id');
      expect(superAuthenticateMock).toHaveBeenCalled();
      expect(req._ldapConfig).toBe(mockLdapConfig);

      // Restore the original method
      Object.getPrototypeOf(strategy).authenticate = originalAuthenticate;
    });

    it('should handle errors when getting LDAP configuration', async () => {
      // Mock the getLdapConfiguration method to throw
      jest.spyOn(strategy, 'getLdapConfiguration').mockRejectedValue(new Error('Test error'));

      // Mock the fail method
      const failMock = jest.fn();
      (strategy as any).fail = failMock;

      // Create a mock request
      const req = { body: { ldapConfigurationId: 'invalid-id' } };
      const options = {};

      // Call the method
      strategy.authenticate(req, options);

      // Wait for promises to resolve
      await new Promise(process.nextTick);

      // Verify the expected behavior
      expect(failMock).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should map LDAP user to user properties', async () => {
      // Mock the mapLdapUser method
      jest.spyOn(ldapService, 'mapLdapUser').mockResolvedValue({
        id: 'testuser',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        roles: ['user']
      });

      // Create mock request and user
      const req: any = { _ldapConfig: mockLdapConfig };
      
      // Call the method
      const result = await strategy.validate(req, mockLdapUser);

      // Verify the expected behavior
      expect(ldapService.mapLdapUser).toHaveBeenCalledWith(mockLdapUser, mockLdapConfig);
      expect(result).toEqual({
        id: 'testuser',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        roles: ['user']
      });
    });

    it('should throw UnauthorizedException when user is null', async () => {
      // Create mock request
      const req: any = { _ldapConfig: mockLdapConfig };
      
      // Call the method and expect exception
      await expect(strategy.validate(req, null)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when mapping fails', async () => {
      // Mock the mapLdapUser method to throw
      jest.spyOn(ldapService, 'mapLdapUser').mockRejectedValue(new Error('Mapping error'));

      // Create mock request and user
      const req: any = { _ldapConfig: mockLdapConfig };
      
      // Call the method and expect exception
      await expect(strategy.validate(req, mockLdapUser)).rejects.toThrow(UnauthorizedException);
    });
  });
});