import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  type?: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'SOME-VERY-LONG-SECRET-AND-RANDOM',
    });
  }

  async validate(payload: JwtPayload) {
    // Simple validation, just return the payload
    // The user's existence could be verified from a database here
    if (!payload) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Ensure this is an access token, not a refresh token
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles,
    };
  }
} 