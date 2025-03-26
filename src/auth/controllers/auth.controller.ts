import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LdapService } from '../services/ldap.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LocalAuthGuard } from '../guards/local-auth.guard';
import { LdapAuthGuard } from '../guards/ldap-auth.guard';
import { Public } from '../decorators/public.decorator';
import {
  AuthResponseDto,
  CreateLdapConfigurationDto,
  LoginDto,
  TokenRefreshDto,
  TokenRefreshResponseDto,
  UpdateLdapConfigurationDto,
} from '../dto';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { UseGuards as UseCustomGuards } from '../../common/decorators/use-guards.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private ldapService: LdapService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @UseCustomGuards(RateLimitGuard)
  @RateLimit(5, 60) // 5 attempts per minute
  @Post('login')
  @ApiOperation({ summary: 'Authenticate user with local strategy and get JWT token' })
  @ApiResponse({ 
    status: 200, 
    description: 'User authenticated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async login(@Body() loginDto: LoginDto, @Request() req): Promise<AuthResponseDto> {
    try {
      this.logger.debug(`Login attempt for user: ${loginDto.username}`);
      return this.authService.generateAuthResponse(req.user);
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`);
      throw new HttpException(
        { 
          status: HttpStatus.UNAUTHORIZED, 
          error: 'Authentication failed', 
          message: 'Invalid username or password' 
        }, 
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Public()
  @UseGuards(LdapAuthGuard)
  @UseCustomGuards(RateLimitGuard)
  @RateLimit(5, 60) // 5 attempts per minute
  @Post('login/ldap')
  @ApiOperation({ summary: 'Authenticate user with LDAP and get JWT token' })
  @ApiResponse({ 
    status: 200, 
    description: 'User authenticated successfully with LDAP',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async ldapLogin(@Body() loginDto: LoginDto, @Request() req): Promise<AuthResponseDto> {
    try {
      this.logger.debug(`LDAP login attempt for user: ${loginDto.username}`);
      return this.authService.generateAuthResponse(req.user);
    } catch (error) {
      this.logger.error(`LDAP login failed: ${error.message}`);
      throw new HttpException(
        { 
          status: HttpStatus.UNAUTHORIZED, 
          error: 'Authentication failed', 
          message: 'Invalid LDAP credentials or configuration' 
        }, 
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully',
    type: TokenRefreshResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshDto: TokenRefreshDto): Promise<TokenRefreshResponseDto> {
    return this.authService.refreshToken(refreshDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('ldap')
  @ApiOperation({ summary: 'Get all LDAP configurations' })
  @ApiResponse({ status: 200, description: 'List of LDAP configurations' })
  async getAllLdapConfigurations() {
    return this.ldapService.getAllConfigurations();
  }

  @UseGuards(JwtAuthGuard)
  @Get('ldap/:id')
  @ApiOperation({ summary: 'Get LDAP configuration by ID' })
  @ApiResponse({ status: 200, description: 'LDAP configuration' })
  @ApiResponse({ status: 404, description: 'LDAP configuration not found' })
  async getLdapConfiguration(@Param('id') id: string) {
    return this.ldapService.getConfigurationById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ldap')
  @ApiOperation({ summary: 'Create new LDAP configuration' })
  @ApiResponse({ status: 201, description: 'LDAP configuration created' })
  async createLdapConfiguration(@Body() dto: CreateLdapConfigurationDto) {
    return this.ldapService.createConfiguration(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('ldap/:id')
  @ApiOperation({ summary: 'Update LDAP configuration' })
  @ApiResponse({ status: 200, description: 'LDAP configuration updated' })
  @ApiResponse({ status: 404, description: 'LDAP configuration not found' })
  async updateLdapConfiguration(
    @Param('id') id: string,
    @Body() dto: UpdateLdapConfigurationDto,
  ) {
    return this.ldapService.updateConfiguration(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('ldap/:id')
  @ApiOperation({ summary: 'Delete LDAP configuration' })
  @ApiResponse({ status: 200, description: 'LDAP configuration deleted' })
  @ApiResponse({ status: 404, description: 'LDAP configuration not found' })
  async deleteLdapConfiguration(@Param('id') id: string) {
    const result = await this.ldapService.deleteConfiguration(id);
    return { success: result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('ldap/:id/test')
  @ApiOperation({ summary: 'Test LDAP connection' })
  @ApiResponse({ status: 200, description: 'LDAP connection test result' })
  @ApiResponse({ status: 404, description: 'LDAP configuration not found' })
  async testLdapConnection(@Param('id') id: string) {
    return this.ldapService.testConnection(id);
  }
}