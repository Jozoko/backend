import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ConfigurationDataType } from '../entities/configuration-key.entity';

export class UpdateConfigurationDto {
  @IsOptional()
  value?: any;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ConfigurationDataType)
  dataType?: ConfigurationDataType;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  environment?: string;
} 