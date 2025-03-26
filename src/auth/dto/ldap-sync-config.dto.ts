import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsOptional, IsEnum, IsBoolean, IsInt, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SyncScope, ConflictPolicy, SyncFrequency } from '../entities/ldap-sync-config.entity';

export class CreateLdapSyncConfigDto {
  @ApiProperty({ description: 'Name of the sync configuration' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Optional description of the sync configuration' })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ description: 'LDAP configuration ID to use for synchronization' })
  @IsNotEmpty()
  @IsUUID()
  ldapConfigurationId: string;

  @ApiProperty({ 
    description: 'Sync frequency', 
    enum: SyncFrequency,
    default: SyncFrequency.DAILY 
  })
  @IsEnum(SyncFrequency)
  frequency: SyncFrequency;

  @ApiPropertyOptional({ 
    description: 'Custom cron expression (only used when frequency is CUSTOM)' 
  })
  @IsOptional()
  @IsString()
  cronExpression: string;

  @ApiProperty({ 
    description: 'Sync scope - what to synchronize', 
    enum: SyncScope,
    default: SyncScope.BOTH 
  })
  @IsEnum(SyncScope)
  scope: SyncScope;

  @ApiProperty({ 
    description: 'How to handle conflicts between LDAP and local data', 
    enum: ConflictPolicy,
    default: ConflictPolicy.LDAP_WINS 
  })
  @IsEnum(ConflictPolicy)
  conflictPolicy: ConflictPolicy;

  @ApiPropertyOptional({ 
    description: 'Field names to exclude from conflict policy (only used with SELECTIVE policy)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  fieldExceptions: string[];

  @ApiProperty({ 
    description: 'Whether the sync configuration is active',
    default: true 
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ 
    description: 'Number of records to process in a single batch',
    default: 100,
    minimum: 10,
    maximum: 1000
  })
  @IsInt()
  @Min(10)
  @Max(1000)
  batchSize: number;
}

export class UpdateLdapSyncConfigDto {
  @ApiPropertyOptional({ description: 'Name of the sync configuration' })
  @IsOptional()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description of the sync configuration' })
  @IsOptional()
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'LDAP configuration ID to use for synchronization' })
  @IsOptional()
  @IsUUID()
  ldapConfigurationId: string;

  @ApiPropertyOptional({ 
    description: 'Sync frequency', 
    enum: SyncFrequency
  })
  @IsOptional()
  @IsEnum(SyncFrequency)
  frequency: SyncFrequency;

  @ApiPropertyOptional({ 
    description: 'Custom cron expression (only used when frequency is CUSTOM)' 
  })
  @IsOptional()
  @IsString()
  cronExpression: string;

  @ApiPropertyOptional({ 
    description: 'Sync scope - what to synchronize', 
    enum: SyncScope
  })
  @IsOptional()
  @IsEnum(SyncScope)
  scope: SyncScope;

  @ApiPropertyOptional({ 
    description: 'How to handle conflicts between LDAP and local data', 
    enum: ConflictPolicy
  })
  @IsOptional()
  @IsEnum(ConflictPolicy)
  conflictPolicy: ConflictPolicy;

  @ApiPropertyOptional({ 
    description: 'Field names to exclude from conflict policy (only used with SELECTIVE policy)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  fieldExceptions: string[];

  @ApiPropertyOptional({ 
    description: 'Whether the sync configuration is active'
  })
  @IsOptional()
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ 
    description: 'Number of records to process in a single batch',
    minimum: 10,
    maximum: 1000
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  batchSize: number;
}

export class TriggerSyncDto {
  @ApiProperty({ 
    description: 'Whether to perform a full synchronization',
    default: true
  })
  @IsBoolean()
  fullSync: boolean;

  @ApiPropertyOptional({ 
    description: 'Batch size for processing',
    minimum: 10,
    maximum: 1000
  })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  batchSize: number;

  @ApiPropertyOptional({ 
    description: 'Override the default conflict policy for this sync',
    enum: ConflictPolicy
  })
  @IsOptional()
  @IsEnum(ConflictPolicy)
  conflictPolicy: ConflictPolicy;

  @ApiPropertyOptional({ 
    description: 'Override the default sync scope for this sync',
    enum: SyncScope
  })
  @IsOptional()
  @IsEnum(SyncScope)
  scope: SyncScope;
} 