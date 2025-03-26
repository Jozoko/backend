import { Controller, Get, Post, Body, Param, UseGuards, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { LdapRoleMapping } from '../entities';

@ApiTags('role-mappings')
@ApiBearerAuth()
@Controller('role-mappings')
export class RolesMappingController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('ldap')
  @ApiOperation({ summary: 'Get all LDAP role mappings' })
  async findAllLdapMappings(): Promise<any[]> {
    // Placeholder method - to be implemented later
    return [];
  }

  @Post('ldap')
  @ApiOperation({ summary: 'Create LDAP role mapping' })
  async createLdapMapping(
    @Body() mappingData: { ldapGroup: string; roleId: string }
  ): Promise<LdapRoleMapping> {
    return this.rolesService.mapLdapGroupToRole(
      mappingData.ldapGroup,
      mappingData.roleId
    );
  }

  @Post('user')
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRoleToUser(
    @Body() assignData: { userId: string; roleId: string }
  ): Promise<any> {
    return this.rolesService.assignRoleToUser(
      assignData.userId,
      assignData.roleId
    );
  }
} 