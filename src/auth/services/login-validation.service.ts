import { Injectable, Logger } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LoginValidationService {
  private readonly logger = new Logger(LoginValidationService.name);

  /**
   * Validate login credentials for security threats
   * @param loginDto The login credentials
   * @returns Validation result with any security warnings
   */
  validateLoginCredentials(loginDto: LoginDto): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      securityWarnings: [],
    };

    // Check for potential username injection attacks
    if (this.containsSqlInjection(loginDto.username)) {
      result.isValid = false;
      result.securityWarnings.push('Username contains potential SQL injection patterns');
      this.logger.warn(`Potential SQL injection attempt in login: ${loginDto.username}`);
    }

    // Check for overly long values that could indicate attacks
    if (loginDto.username.length > 100) {
      result.isValid = false;
      result.securityWarnings.push('Username exceeds maximum allowed length');
    }

    // Password strength is intentionally not checked here
    // It would be inappropriate to reject login attempts based on password strength
    // Password strength should be enforced during registration/password change instead

    return result;
  }

  /**
   * Basic check for SQL injection patterns
   * Note: This is a simple check and not a replacement for parameter binding
   */
  private containsSqlInjection(value: string): boolean {
    if (!value) return false;

    // Check for common SQL injection patterns
    const sqlPatterns = [
      /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|EXEC|EXECUTE)(\s|$)/i,
      /['"];/i,
      /--/,
      /\/\*/,
      /\*\//,
      /xp_/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }
}

export interface ValidationResult {
  isValid: boolean;
  securityWarnings: string[];
} 