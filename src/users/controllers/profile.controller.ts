import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProfileService } from '../services/profile.service';
import { UpdatePreferencesDto, UserPreferencesDto } from '../dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserPreferences } from '../entities';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences', 
    type: UserPreferencesDto 
  })
  async getUserPreferences(@Request() req) {
    return this.profileService.getUserPreferences(req.user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update current user preferences' })
  @ApiResponse({ 
    status: 200, 
    description: 'User preferences updated', 
    type: UserPreferencesDto 
  })
  async updateUserPreferences(
    @Request() req,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.profileService.updateUserPreferences(
      req.user.id,
      updatePreferencesDto as Partial<UserPreferences>,
    );
  }
} 