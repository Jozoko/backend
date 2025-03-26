import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    
    // Don't log sensitive data like passwords
    const sanitizedBody = this.sanitizeBody(body);
    
    const now = Date.now();
    this.logger.log(
      `Request: ${method} ${url} - IP: ${ip} - UserAgent: ${userAgent}`,
    );
    
    if (Object.keys(sanitizedBody).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap({
        next: (response) => {
          const delay = Date.now() - now;
          this.logger.log(
            `Response: ${method} ${url} - ${delay}ms`,
          );
          this.logger.debug(`Response Body: ${this.truncateResponse(response)}`);
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `Error: ${method} ${url} - ${delay}ms - ${error.message}`,
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
    
    // Sanitize sensitive fields
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '******';
      }
    });
    
    return sanitized;
  }

  private truncateResponse(response: any): string {
    if (!response) return 'null';
    
    try {
      const responseStr = JSON.stringify(response);
      // Truncate very long responses
      if (responseStr.length > 500) {
        return `${responseStr.substring(0, 500)}... [truncated]`;
      }
      return responseStr;
    } catch (error) {
      return '[Cannot stringify response]';
    }
  }
} 