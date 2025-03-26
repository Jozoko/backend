import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ConfigurationDataType } from '../entities/configuration-key.entity';

export class CreateConfigurationDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsNotEmpty()
  value: any;

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