import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards';
import { LdapSyncService } from '../services/ldap-sync.service';
import { CreateLdapSyncConfigDto, UpdateLdapSyncConfigDto, TriggerSyncDto } from '../dto/ldap-sync-config.dto';
import { LdapSyncConfig } from '../entities/ldap-sync-config.entity';

@ApiTags('LDAP Synchronization')
@Controller('auth/ldap-sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LdapSyncController {
  private readonly logger = new Logger(LdapSyncController.name);

  constructor(private readonly ldapSyncService: LdapSyncService) {}

  @Get()
  @ApiOperation({ summary: 'Get all LDAP sync configurations' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns all LDAP sync configurations',
    type: [LdapSyncConfig]
  })
  async getAllConfigurations(): Promise<LdapSyncConfig[]> {
    return this.ldapSyncService.getAllConfigurations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get LDAP sync configuration by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns the LDAP sync configuration',
    type: LdapSyncConfig
  })
  async getConfigurationById(@Param('id') id: string): Promise<LdapSyncConfig> {
    return this.ldapSyncService.getConfigurationById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new LDAP sync configuration' })
  @ApiResponse({ 
    status: 201, 
    description: 'The LDAP sync configuration has been created',
    type: LdapSyncConfig
  })
  async createConfiguration(
    @Body() dto: CreateLdapSyncConfigDto
  ): Promise<LdapSyncConfig> {
    return this.ldapSyncService.createConfiguration(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an LDAP sync configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'The LDAP sync configuration has been updated',
    type: LdapSyncConfig
  })
  async updateConfiguration(
    @Param('id') id: string,
    @Body() dto: UpdateLdapSyncConfigDto
  ): Promise<LdapSyncConfig> {
    return this.ldapSyncService.updateConfiguration(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an LDAP sync configuration' })
  @ApiResponse({ status: 200, description: 'The LDAP sync configuration has been deleted' })
  async deleteConfiguration(@Param('id') id: string): Promise<{ success: boolean }> {
    const result = await this.ldapSyncService.deleteConfiguration(id);
    return { success: result };
  }

  @Post(':id/trigger')
  @ApiOperation({ summary: 'Trigger an immediate sync' })
  @ApiResponse({ status: 202, description: 'The sync job has been queued' })
  async triggerSync(
    @Param('id') id: string,
    @Body() dto: TriggerSyncDto
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.ldapSyncService.triggerSyncNow(id, dto);
      return { 
        success: true, 
        message: 'LDAP synchronization job has been queued'
      };
    } catch (error) {
      this.logger.error(`Error triggering sync: ${error.message}`);
      return { 
        success: false, 
        message: `Failed to trigger sync: ${error.message}`
      };
    }
  }
} 