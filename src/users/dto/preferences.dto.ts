import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UserPreferencesDto {
  @ApiProperty({ description: 'Preferences ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Language preference', example: 'en' })
  language: string;

  @ApiProperty({ description: 'Theme preference', example: 'light' })
  theme: string;

  @ApiProperty({ description: 'Notifications enabled' })
  notifications: boolean;

  @ApiProperty({ description: 'Additional settings', type: 'object' })
  settings: Record<string, any>;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Language preference', example: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Theme preference', example: 'dark' })
  @IsString()
  @IsOptional()
  theme?: string;

  @ApiPropertyOptional({ description: 'Notifications enabled' })
  @IsBoolean()
  @IsOptional()
  notifications?: boolean;

  @ApiPropertyOptional({ description: 'Additional settings', type: 'object' })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
} 