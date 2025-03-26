import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission, RolePermission } from '../entities';
import { BaseRepository } from '../../common/services/base.repository';
import { RolesService } from './roles.service';

@Injectable()
export class PermissionsService extends BaseRepository<Permission> {
  protected readonly logger = new Logger(PermissionsService.name);
  private permissionCache: Map<string, boolean> = new Map();

  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {
    super(permissionRepository);
  }

  /**
   * Get permissions by role ID
   */
  async getPermissionsByRoleId(roleId: string): Promise<Permission[]> {
    try {
      const rolePermissions = await this.rolePermissionRepository.find({
        where: { role: { id: roleId } },
        relations: ['permission'],
      });

      return rolePermissions.map(rp => rp.permission);
    } catch (error) {
      this.logger.error(`Error getting permissions for role ${roleId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Assign permission to role
   */
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<RolePermission> {
    try {
      const rolePermission = this.rolePermissionRepository.create({
        role: { id: roleId },
        permission: { id: permissionId }
      });
      
      const savedRolePermission = await this.rolePermissionRepository.save(rolePermission);
      
      // Clear cache when role permissions change
      this.clearPermissionCache();
      
      return savedRolePermission;
    } catch (error) {
      this.logger.error(`Error assigning permission ${permissionId} to role ${roleId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user has specific permission
   * @param userId The user's ID
   * @param permissionKey The permission key in format "resource:action"
   * @returns True if the user has the permission, false otherwise
   */
  async userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
    // Create a cache key using the userId and permissionKey
    const cacheKey = `${userId}:${permissionKey}`;
    
    // Check if we have the result cached
    const cachedResult = this.permissionCache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    
    try {
      // Parse the permission key
      const [resource, action] = permissionKey.split(':');
      if (!resource || !action) {
        this.logger.warn(`Invalid permission key format: ${permissionKey}`);
        return false;
      }
      
      // Find the permission in the database based on resource and action
      const permission = await this.permissionRepository.findOne({
        where: { resource, action },
      });
      
      if (!permission) {
        this.logger.warn(`Permission not found: ${permissionKey}`);
        return false;
      }
      
      // Check if the user has this permission through any of their roles
      const result = await this.rolePermissionRepository
        .createQueryBuilder('rolePermission')
        .innerJoin('rolePermission.role', 'role')
        .innerJoin('role.userRoles', 'userRole')
        .where('userRole.userId = :userId', { userId })
        .andWhere('rolePermission.permissionId = :permissionId', { permissionId: permission.id })
        .getCount();
      
      const hasPermission = result > 0;
      
      // Cache the result (TTL could be implemented here)
      this.permissionCache.set(cacheKey, hasPermission);
      
      return hasPermission;
    } catch (error) {
      this.logger.error(`Error checking permission ${permissionKey} for user ${userId}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Clear the permission cache
   * Call this when permissions change
   */
  clearPermissionCache(): void {
    this.permissionCache.clear();
    this.logger.debug('Permission cache cleared');
  }
} 