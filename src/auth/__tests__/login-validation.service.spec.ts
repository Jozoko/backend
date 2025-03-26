import { Test, TestingModule } from '@nestjs/testing';
import { LoginValidationService } from '../services/login-validation.service';
import { LoginDto } from '../dto/login.dto';

describe('LoginValidationService', () => {
  let service: LoginValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoginValidationService],
    }).compile();

    service = module.get<LoginValidationService>(LoginValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateLoginCredentials', () => {
    it('should validate valid credentials', () => {
      const loginDto: LoginDto = {
        username: 'john.doe',
        password: 'Password123!',
      };

      const result = service.validateLoginCredentials(loginDto);
      expect(result.isValid).toBe(true);
      expect(result.securityWarnings).toHaveLength(0);
    });

    it('should detect SQL injection patterns in username', () => {
      const loginDto: LoginDto = {
        username: "admin'; DROP TABLE users; --",
        password: 'Password123!',
      };

      const result = service.validateLoginCredentials(loginDto);
      expect(result.isValid).toBe(false);
      expect(result.securityWarnings).toContain('Username contains potential SQL injection patterns');
    });

    it('should detect overly long usernames', () => {
      const loginDto: LoginDto = {
        username: 'a'.repeat(101),
        password: 'Password123!',
      };

      const result = service.validateLoginCredentials(loginDto);
      expect(result.isValid).toBe(false);
      expect(result.securityWarnings).toContain('Username exceeds maximum allowed length');
    });

    it('should detect multiple security issues', () => {
      const loginDto: LoginDto = {
        username: 'a'.repeat(101) + " OR 1=1; --",
        password: 'Password123!',
      };

      const result = service.validateLoginCredentials(loginDto);
      expect(result.isValid).toBe(false);
      expect(result.securityWarnings.length).toBeGreaterThan(1);
    });
  });

  describe('SQL injection detection', () => {
    it('should detect basic SQL injection patterns', () => {
      const testCases = [
        "admin' OR '1'='1",
        "admin; DROP TABLE users;",
        "admin UNION SELECT * FROM users",
        "admin/**/OR/**/1=1",
        "admin; EXEC xp_cmdshell('dir');",
      ];

      for (const testCase of testCases) {
        const loginDto: LoginDto = {
          username: testCase,
          password: 'Password123!',
        };

        const result = service.validateLoginCredentials(loginDto);
        expect(result.isValid).toBe(false);
        expect(result.securityWarnings).toContain('Username contains potential SQL injection patterns');
      }
    });

    it('should not flag legitimate usernames', () => {
      const testCases = [
        "john.doe",
        "jane_smith",
        "user123",
        "john-smith",
        "j.smith@example.com",
      ];

      for (const testCase of testCases) {
        const loginDto: LoginDto = {
          username: testCase,
          password: 'Password123!',
        };

        const result = service.validateLoginCredentials(loginDto);
        expect(result.isValid).toBe(true);
      }
    });
  });
}); 