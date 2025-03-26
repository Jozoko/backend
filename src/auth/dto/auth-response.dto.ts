import { ApiProperty } from '@nestjs/swagger';

export class AuthTokenDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'Token type (always Bearer)' })
  tokenType: string;

  @ApiProperty({ description: 'Token expiration time in seconds' })
  expiresIn: number;

  @ApiProperty({ 
    description: 'JWT refresh token for obtaining new access tokens',
    required: false
  })
  refreshToken?: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Authentication successful' })
  success: boolean;

  @ApiProperty({ description: 'JWT token information' })
  token: AuthTokenDto;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'User display name' })
  displayName: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User roles' })
  roles: string[];
} 