import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserService } from '../services/user.service';
import { User, UserLdapDetails } from '../entities';
import { AuditService } from '../../common/services/audit.service';
import { RolesService } from '../../roles/services/roles.service';
import { Role, UserRole } from '../../roles/entities';

describe('UserService - LDAP Creation', () => {
  let userService: UserService;
  let rolesService: RolesService;
  let userRepository: Repository<User>;
  let userLdapDetailsRepository: Repository<UserLdapDetails>;
  let userRoleRepository: Repository<UserRole>;
  let dataSource: DataSource;

  const mockUser = {
    id: 'user-id-1',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    isActive: true,
    ldapConfigurationId: 'ldap-config-id',
    ldapDetails: [],
    userRoles: [],
  };

  const mockLdapUser = {
    id: 'objectguid-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    ldapDn: 'CN=Test User,OU=Users,DC=example,DC=com',
    memberOf: [
      'CN=IT Department,OU=Groups,DC=example,DC=com',
      'CN=Admin Users,OU=Groups,DC=example,DC=com'
    ],
    samAccountName: 'testuser',
    userPrincipalName: 'testuser@example.com',
    objectGUID: 'objectguid-123',
  };

  const mockRoles = [
    { id: 'role-id-1', name: 'IT Staff', description: 'IT Department Staff' },
    { id: 'role-id-2', name: 'Admin', description: 'Administrators' },
  ];

  // Mock the query runner for transactions
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserLdapDetails),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logCreation: jest.fn(),
            logUpdate: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
        {
          provide: RolesService,
          useValue: {
            getRolesByLdapGroups: jest.fn(),
            assignRolesToUserFromLdap: jest.fn(),
            findOne: jest.fn(),
            assignRoleToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    rolesService = module.get<RolesService>(RolesService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userLdapDetailsRepository = module.get<Repository<UserLdapDetails>>(getRepositoryToken(UserLdapDetails));
    dataSource = module.get<DataSource>(DataSource);

    // Reset mock call counts before each test
    jest.clearAllMocks();
  });

  describe('createOrUpdateFromLdap', () => {
    it('should create a new user from LDAP with roles mapped from LDAP groups', async () => {
      // Mock dependencies
      jest.spyOn(userService, 'findByUsername').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, id: 'new-user-id' } as User);
      jest.spyOn(userLdapDetailsRepository, 'create').mockReturnValue({} as UserLdapDetails);
      jest.spyOn(userLdapDetailsRepository, 'save').mockResolvedValue({} as UserLdapDetails);
      jest.spyOn(rolesService, 'getRolesByLdapGroups').mockResolvedValue(mockRoles as Role[]);
      jest.spyOn(rolesService, 'assignRolesToUserFromLdap').mockResolvedValue([]);

      // Execute the test
      const result = await userService.createOrUpdateFromLdap(mockLdapUser, 'ldap-config-id');

      // Assert the results
      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(userService.findByUsername).toHaveBeenCalledWith('testuser');
      expect(userRepository.create).toHaveBeenCalledWith({
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        isActive: true,
        lastLoginAt: expect.any(Date),
        ldapConfigurationId: 'ldap-config-id',
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(userLdapDetailsRepository.create).toHaveBeenCalledWith({
        userId: 'new-user-id',
        ldapConfigurationId: 'ldap-config-id',
        distinguishedName: 'CN=Test User,OU=Users,DC=example,DC=com',
        objectGUID: 'objectguid-123',
        groups: ['CN=IT Department,OU=Groups,DC=example,DC=com', 'CN=Admin Users,OU=Groups,DC=example,DC=com'],
        lastSyncAt: expect.any(Date),
        rawData: {},
      });
      expect(userLdapDetailsRepository.save).toHaveBeenCalled();
      expect(rolesService.getRolesByLdapGroups).toHaveBeenCalledWith(
        ['CN=IT Department,OU=Groups,DC=example,DC=com', 'CN=Admin Users,OU=Groups,DC=example,DC=com'],
        'ldap-config-id'
      );
      expect(rolesService.assignRolesToUserFromLdap).toHaveBeenCalledWith('new-user-id', mockRoles);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should update an existing user from LDAP with role mapping', async () => {
      // Mock dependencies
      const existingUser = { 
        ...mockUser, 
        ldapDetails: [{ 
          id: 'ldap-detail-id', 
          distinguishedName: 'old-dn',
          groups: [],
          lastSyncAt: new Date('2023-01-01')
        }] 
      };
      jest.spyOn(userService, 'findByUsername').mockResolvedValue(existingUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue(existingUser as User);
      jest.spyOn(userLdapDetailsRepository, 'save').mockResolvedValue({} as UserLdapDetails);
      jest.spyOn(rolesService, 'getRolesByLdapGroups').mockResolvedValue(mockRoles as Role[]);
      jest.spyOn(rolesService, 'assignRolesToUserFromLdap').mockResolvedValue([]);

      // Execute the test
      const result = await userService.createOrUpdateFromLdap(mockLdapUser, 'ldap-config-id');

      // Assert the results
      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(userService.findByUsername).toHaveBeenCalledWith('testuser');
      
      // Verify user properties are updated
      expect(existingUser.displayName).toBe('Test User');
      expect(existingUser.email).toBe('test@example.com');
      expect(existingUser.lastLoginAt).toBeInstanceOf(Date);
      expect(existingUser.ldapConfigurationId).toBe('ldap-config-id');
      
      // Verify LDAP details are updated
      expect(existingUser.ldapDetails[0].distinguishedName).toBe('CN=Test User,OU=Users,DC=example,DC=com');
      expect(existingUser.ldapDetails[0].groups).toEqual([
        'CN=IT Department,OU=Groups,DC=example,DC=com', 
        'CN=Admin Users,OU=Groups,DC=example,DC=com'
      ]);
      expect(existingUser.ldapDetails[0].lastSyncAt).not.toEqual(new Date('2023-01-01'));
      
      expect(rolesService.getRolesByLdapGroups).toHaveBeenCalledWith(
        ['CN=IT Department,OU=Groups,DC=example,DC=com', 'CN=Admin Users,OU=Groups,DC=example,DC=com'],
        'ldap-config-id'
      );
      expect(rolesService.assignRolesToUserFromLdap).toHaveBeenCalledWith('user-id-1', mockRoles);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should assign a default role when no matching LDAP role mappings found for new user', async () => {
      // Mock dependencies
      jest.spyOn(userService, 'findByUsername').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockResolvedValue({ ...mockUser, id: 'new-user-id' } as User);
      jest.spyOn(userLdapDetailsRepository, 'create').mockReturnValue({} as UserLdapDetails);
      jest.spyOn(userLdapDetailsRepository, 'save').mockResolvedValue({} as UserLdapDetails);
      jest.spyOn(rolesService, 'getRolesByLdapGroups').mockResolvedValue([]);
      jest.spyOn(rolesService, 'findOne').mockResolvedValue({ id: 'default-role-id', name: 'user' } as Role);
      jest.spyOn(rolesService, 'assignRoleToUser').mockResolvedValue({} as UserRole);

      // Execute the test
      const result = await userService.createOrUpdateFromLdap(mockLdapUser, 'ldap-config-id');

      // Assert the results
      expect(rolesService.getRolesByLdapGroups).toHaveBeenCalledWith(
        ['CN=IT Department,OU=Groups,DC=example,DC=com', 'CN=Admin Users,OU=Groups,DC=example,DC=com'],
        'ldap-config-id'
      );
      expect(rolesService.findOne).toHaveBeenCalledWith({ where: { name: 'user' } });
      expect(rolesService.assignRoleToUser).toHaveBeenCalledWith('new-user-id', 'default-role-id');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle database errors and roll back transaction', async () => {
      // Mock dependencies
      jest.spyOn(userService, 'findByUsername').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockReturnValue(mockUser as User);
      jest.spyOn(userRepository, 'save').mockImplementation(() => {
        throw new Error('Database error');
      });

      // Execute the test with expectation of error
      await expect(userService.createOrUpdateFromLdap(mockLdapUser, 'ldap-config-id')).rejects.toThrow('Database error');

      // Assert transaction management
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
}); 