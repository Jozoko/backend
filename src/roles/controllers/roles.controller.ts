import { Controller, Get, Post, Body, Param, UseGuards, Delete, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { Role } from '../entities';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  async findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string): Promise<Role> {
    const role = await this.rolesService.findById(id);
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  // Placeholder controller methods - to be implemented later
  @Post()
  @ApiOperation({ summary: 'Create a new role' })
  async create(@Body() roleData: Partial<Role>): Promise<Role> {
    return this.rolesService.create(roleData);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get roles for user' })
  async getRolesForUser(@Param('userId') userId: string): Promise<Role[]> {
    return this.rolesService.getRolesByUserId(userId);
  }
} 