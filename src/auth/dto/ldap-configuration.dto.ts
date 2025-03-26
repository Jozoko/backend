import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsBoolean, 
  IsNotEmpty, 
  IsNumber, 
  IsObject, 
  IsOptional, 
  IsString, 
  Matches 
} from 'class-validator';

export class CreateLdapConfigurationDto {
  @ApiProperty({ description: 'LDAP configuration name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'LDAP configuration description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'LDAP server host' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiProperty({ description: 'LDAP server port' })
  @IsNumber()
  @IsNotEmpty()
  port: number;

  @ApiProperty({ description: 'LDAP base DN' })
  @IsString()
  @IsNotEmpty()
  baseDN: string;

  @ApiProperty({ description: 'LDAP bind DN' })
  @IsString()
  @IsNotEmpty()
  bindDN: string;

  @ApiProperty({ description: 'LDAP bind credentials (password)' })
  @IsString()
  @IsNotEmpty()
  bindCredentials: string;

  @ApiProperty({ description: 'LDAP search filter' })
  @IsString()
  @IsNotEmpty()
  searchFilter: string;

  @ApiPropertyOptional({ description: 'Set as default LDAP configuration', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'LDAP configuration active status', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Use TLS for LDAP connection', default: false })
  @IsBoolean()
  @IsOptional()
  useTLS?: boolean;

  @ApiPropertyOptional({ description: 'Path to TLS certificate' })
  @IsString()
  @IsOptional()
  tlsCertPath?: string;

  @ApiPropertyOptional({ description: 'Username suffix (e.g. @domain.com)' })
  @IsString()
  @IsOptional()
  usernameSuffix?: string;

  @ApiPropertyOptional({ description: 'LDAP attribute mapping', default: {} })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, string>;

  @ApiProperty({ description: 'Synchronization schedule (cron expression)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, {
    message: 'syncSchedule must be a valid cron expression',
  })
  syncSchedule: string;
}

export class UpdateLdapConfigurationDto {
  @ApiPropertyOptional({ description: 'LDAP configuration name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'LDAP configuration description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'LDAP server host' })
  @IsString()
  @IsOptional()
  host?: string;

  @ApiPropertyOptional({ description: 'LDAP server port' })
  @IsNumber()
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ description: 'LDAP base DN' })
  @IsString()
  @IsOptional()
  baseDN?: string;

  @ApiPropertyOptional({ description: 'LDAP bind DN' })
  @IsString()
  @IsOptional()
  bindDN?: string;

  @ApiPropertyOptional({ description: 'LDAP bind credentials (password)' })
  @IsString()
  @IsOptional()
  bindCredentials?: string;

  @ApiPropertyOptional({ description: 'LDAP search filter' })
  @IsString()
  @IsOptional()
  searchFilter?: string;

  @ApiPropertyOptional({ description: 'Set as default LDAP configuration' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'LDAP configuration active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Use TLS for LDAP connection' })
  @IsBoolean()
  @IsOptional()
  useTLS?: boolean;

  @ApiPropertyOptional({ description: 'Path to TLS certificate' })
  @IsString()
  @IsOptional()
  tlsCertPath?: string;

  @ApiPropertyOptional({ description: 'Username suffix (e.g. @domain.com)' })
  @IsString()
  @IsOptional()
  usernameSuffix?: string;

  @ApiPropertyOptional({ description: 'LDAP attribute mapping' })
  @IsObject()
  @IsOptional()
  attributes?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Synchronization schedule (cron expression)' })
  @IsString()
  @IsOptional()
  @Matches(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, {
    message: 'syncSchedule must be a valid cron expression',
  })
  syncSchedule?: string;
} 