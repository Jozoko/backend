import { Controller, Get, Post, Body, Param, UseGuards, Delete, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PermissionsService } from '../services/permissions.service';
import { Permission } from '../entities';

@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all permissions' })
  async findAll(): Promise<Permission[]> {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get permission by ID' })
  async findOne(@Param('id') id: string): Promise<Permission> {
    const permission = await this.permissionsService.findById(id);
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  // Placeholder controller methods - to be implemented later
  @Post()
  @ApiOperation({ summary: 'Create a new permission' })
  async create(@Body() permissionData: Partial<Permission>): Promise<Permission> {
    return this.permissionsService.create(permissionData);
  }

  @Get('role/:roleId')
  @ApiOperation({ summary: 'Get permissions for role' })
  async getPermissionsForRole(@Param('roleId') roleId: string): Promise<Permission[]> {
    return this.permissionsService.getPermissionsByRoleId(roleId);
  }
} 