import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { Reflector } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';

// Create test environment
describe('Login Rate Limiting', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    // Set up test module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow requests under the limit', async () => {
      // Mock request
      const mockRequest = {
        ip: '127.0.0.1',
        path: '/api/auth/login',
      };

      // Mock execution context
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      };

      // Mock reflector to return our custom limits
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'rateLimit') return 5; // 5 requests
        if (key === 'rateLimitTtl') return 60; // 60 seconds
        return null;
      });

      // Process.env.NODE_ENV is not set in tests, so rate limiting should apply
      process.env.NODE_ENV = 'production';

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        const result = await guard.canActivate(mockContext as any);
        expect(result).toBe(true);
      }

      // Reset for next test
      process.env.NODE_ENV = 'test';
    });

    it('should block requests over the limit', async () => {
      // Mock request
      const mockRequest = {
        ip: '127.0.0.2', // Different IP to avoid interference with other tests
        path: '/api/auth/login',
      };

      // Mock execution context
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      };

      // Mock reflector to return our custom limits
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'rateLimit') return 3; // Lower limit for this test
        if (key === 'rateLimitTtl') return 60;
        return null;
      });

      // Force rate limiting to be active
      process.env.NODE_ENV = 'production';

      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        const result = await guard.canActivate(mockContext as any);
        expect(result).toBe(true);
      }

      // 4th request should be blocked
      await expect(guard.canActivate(mockContext as any)).rejects.toThrow(ThrottlerException);

      // Reset for next test
      process.env.NODE_ENV = 'test';
    });

    it('should skip rate limiting in development mode', async () => {
      // Mock request
      const mockRequest = {
        ip: '127.0.0.3',
        path: '/api/auth/login',
      };

      // Mock execution context
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: () => ({}),
      };

      // Mock reflector to return our custom limits
      jest.spyOn(reflector, 'get').mockImplementation((key) => {
        if (key === 'rateLimit') return 1; // Very low limit
        if (key === 'rateLimitTtl') return 60;
        return null;
      });

      // Set development mode
      process.env.NODE_ENV = 'development';

      // Should allow many more requests than the limit
      for (let i = 0; i < 10; i++) {
        const result = await guard.canActivate(mockContext as any);
        expect(result).toBe(true);
      }

      // Reset for next test
      process.env.NODE_ENV = 'test';
    });
  });
}); 