import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from '../auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { User, UserLdapDetails } from '../../users/entities';
import { LdapConfiguration } from '../entities';
import { UsersModule } from '../../users/users.module';
import { CommonModule } from '../../common/common.module';

describe('LDAP Authentication (e2e)', () => {
  let app: INestApplication;
  let mockUserRepository: any;
  let mockUserLdapDetailsRepository: any;
  let mockLdapConfigRepository: any;

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
    isDefault: true,
    useTLS: false,
    description: 'Test LDAP config',
    attributes: {},
    syncSchedule: '0 0 * * *',
  };

  // Mock user used in LDAP authentication
  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ldapConfigurationId: 'test-config-id',
  };

  beforeEach(async () => {
    // Create mock repositories
    mockUserRepository = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockReturnValue(mockUser),
    };

    mockUserLdapDetailsRepository = {
      save: jest.fn(),
      create: jest.fn().mockReturnValue({
        id: 'ldap-details-123',
        userId: 'user-123',
        ldapConfigurationId: 'test-config-id',
        distinguishedName: 'uid=testuser,ou=users,dc=example,dc=com',
        objectGUID: 'test-guid',
        groups: ['users'],
        lastSyncAt: new Date(),
        rawData: {},
      }),
    };

    mockLdapConfigRepository = {
      findOneBy: jest.fn().mockResolvedValue(mockLdapConfig),
      find: jest.fn().mockResolvedValue([mockLdapConfig]),
    };

    // Create the test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'test-secret',
            signOptions: {
              expiresIn: configService.get<string>('JWT_EXPIRATION', '1h'),
            },
          }),
          inject: [ConfigService],
        }),
        CommonModule,
        UsersModule,
        AuthModule,
      ],
    })
      // Override repositories with mocks
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockUserRepository)
      .overrideProvider(getRepositoryToken(UserLdapDetails))
      .useValue(mockUserLdapDetailsRepository)
      .overrideProvider(getRepositoryToken(LdapConfiguration))
      .useValue(mockLdapConfigRepository)
      // Mock LdapStrategy to bypass actual LDAP connection
      .overrideProvider('LdapStrategy')
      .useValue({
        validate: jest.fn().mockResolvedValue(mockUser),
        authenticate: jest.fn().mockImplementation((req, options) => {
          // Simulate successful authentication
          req.user = mockUser;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/auth/login/ldap (POST)', () => {
    it('should authenticate with LDAP and create/update user', async () => {
      // Mock findOneBy to simulate user not found (first-time login)
      mockUserRepository.findOneBy.mockResolvedValueOnce(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login/ldap')
        .send({
          username: 'testuser',
          password: 'password123',
          ldapConfigurationId: 'test-config-id',
        })
        .expect(201);

      // Verify response has expected format
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('username', 'testuser');

      // Verify user creation was called
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockUserLdapDetailsRepository.create).toHaveBeenCalled();
      expect(mockUserLdapDetailsRepository.save).toHaveBeenCalled();
    });

    it('should authenticate with LDAP and update existing user', async () => {
      // Mock findOneBy to simulate existing user
      mockUserRepository.findOneBy.mockResolvedValueOnce(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login/ldap')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(201);

      // Verify response has expected format
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('username', 'testuser');

      // Verify user update was called
      expect(mockUserRepository.save).toHaveBeenCalled();
      // Create should not be called for existing user
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should fail with 401 when authentication fails', async () => {
      // Override the validate mock for this test only
      app.get('LdapStrategy').validate.mockRejectedValueOnce(new Error('Authentication failed'));

      await request(app.getHttpServer())
        .post('/auth/login/ldap')
        .send({
          username: 'testuser',
          password: 'wrong-password',
        })
        .expect(401);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should return user profile with valid JWT', async () => {
      // First login to get a token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login/ldap')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(201);

      const token = loginResponse.body.token.accessToken;

      // Then use the token to access the profile
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('username', 'testuser');
    });

    it('should return 401 without a valid JWT', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });
  });
}); 