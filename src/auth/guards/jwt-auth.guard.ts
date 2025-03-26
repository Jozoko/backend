import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService
  ) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get the request object
    const request = context.switchToHttp().getRequest();
    
    // Get the token from the Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      this.logger.warn('Missing Authorization header');
      return super.canActivate(context);
    }

    // Log token information (not the full token)
    try {
      const token = authHeader.split(' ')[1];
      const decoded = this.jwtService.decode(token);
      this.logger.debug(`Token received: user=${decoded['sub']}, expires=${decoded['exp']}`);
    } catch (error) {
      this.logger.warn(`Invalid token format: ${error.message}`);
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Handle different types of JWT errors
    if (err || !user) {
      let message = 'Invalid or expired token';
      
      if (info) {
        if (info.name === 'TokenExpiredError') {
          message = 'Token has expired';
          this.logger.warn('Token expired');
        } else if (info.name === 'JsonWebTokenError') {
          message = 'Invalid token';
          this.logger.warn(`Invalid token: ${info.message}`);
        } else {
          this.logger.warn(`Authentication error: ${info.message}`);
        }
      }
      
      throw new UnauthorizedException(message);
    }
    return user;
  }
} 