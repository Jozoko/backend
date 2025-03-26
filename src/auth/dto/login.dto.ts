import { 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  Length, 
  Matches, 
  MaxLength 
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ 
    description: 'Username for authentication',
    minLength: 3,
    maxLength: 100,
    example: 'john.doe' 
  })
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @Length(3, 100, { message: 'Username must be between 3 and 100 characters' })
  @Matches(/^[a-zA-Z0-9._@-]+$/, { 
    message: 'Username can only contain letters, numbers, and the special characters ., _, @, -' 
  })
  @Transform(({ value }) => value?.trim())
  username: string;

  @ApiProperty({ 
    description: 'Password for authentication',
    minLength: 8,
    maxLength: 100
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @Length(8, 100, { message: 'Password must be between 8 and 100 characters' })
  password: string;

  @ApiPropertyOptional({ 
    description: 'Optional LDAP configuration ID for specific LDAP server', 
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString({ message: 'LDAP configuration ID must be a string' })
  @IsOptional()
  @MaxLength(36, { message: 'LDAP configuration ID must not exceed 36 characters' })
  @Matches(/^[a-zA-Z0-9-]*$/, { 
    message: 'LDAP configuration ID can only contain letters, numbers, and hyphens' 
  })
  @Transform(({ value }) => value?.trim())
  ldapConfigurationId?: string;
} 