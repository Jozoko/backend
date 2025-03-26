import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, UserRole, LdapRoleMapping, LdapMappingType, UserRoleSource } from '../entities';
import { BaseRepository } from '../../common/services/base.repository';

@Injectable()
export class RolesService extends BaseRepository<Role> {
  protected readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(LdapRoleMapping)
    private readonly ldapRoleMappingRepository: Repository<LdapRoleMapping>,
  ) {
    super(roleRepository);
  }

  /**
   * Get roles by user ID
   */
  async getRolesByUserId(userId: string): Promise<Role[]> {
    try {
      const userRoles = await this.userRoleRepository.find({
        where: { userId },
        relations: ['role'],
      });

      return userRoles.map(ur => ur.role);
    } catch (error) {
      this.logger.error(`Error getting roles for user ${userId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Assign role to user
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<UserRole> {
    try {
      const userRole = this.userRoleRepository.create({
        userId,
        roleId,
      });
      
      const savedUserRole = await this.userRoleRepository.save(userRole);
      return savedUserRole;
    } catch (error) {
      this.logger.error(`Error assigning role ${roleId} to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get roles by LDAP groups
   * Maps LDAP groups to corresponding roles based on the mapping table
   */
  async getRolesByLdapGroups(ldapGroups: string[], ldapConfigId: string): Promise<Role[]> {
    try {
      if (!ldapGroups || ldapGroups.length === 0) {
        this.logger.debug('No LDAP groups provided for role mapping');
        return [];
      }
      
      this.logger.debug(`Getting roles for LDAP groups: ${ldapGroups.join(', ')}`);
      
      // Find mappings for any of the LDAP groups
      const mappings = await this.ldapRoleMappingRepository.find({
        where: [
          { ldapConfigurationId: ldapConfigId },
          { ldapConfigurationId: '00000000-0000-0000-0000-000000000000' } // Default config
        ],
        relations: ['role'],
      });
      
      if (!mappings || mappings.length === 0) {
        this.logger.debug('No LDAP mappings found for the given configuration');
        return [];
      }
      
      // Filter mappings that match the user's LDAP groups
      // Using some sophisticated matching to handle different DN formats
      const matchedMappings = mappings.filter(mapping => {
        return ldapGroups.some(group => {
          const normalizedGroup = group.toLowerCase();
          const normalizedMappingDN = mapping.ldapGroupDN.toLowerCase();
          
          // Direct match
          if (normalizedGroup === normalizedMappingDN) {
            return true;
          }
          
          // Check if the group contains the mapping DN or vice versa
          // This handles cases where different formats of the same group might be used
          if (normalizedGroup.includes(normalizedMappingDN) || 
              normalizedMappingDN.includes(normalizedGroup)) {
            return true;
          }
          
          // Handle CN format differences
          const groupCN = normalizedGroup.match(/cn=([^,]+)/i);
          const mappingCN = normalizedMappingDN.match(/cn=([^,]+)/i);
          
          if (groupCN && mappingCN && groupCN[1] === mappingCN[1]) {
            return true;
          }
          
          return false;
        });
      });
      
      if (!matchedMappings || matchedMappings.length === 0) {
        this.logger.debug('No matching LDAP mappings found for the user groups');
        return [];
      }
      
      // Extract unique roles from the matched mappings
      const roles = matchedMappings
        .map(mapping => mapping.role)
        .filter((role, index, self) => 
          index === self.findIndex(r => r.id === role.id)
        );
      
      this.logger.debug(`Found ${roles.length} roles for LDAP groups`);
      return roles;
    } catch (error) {
      this.logger.error(`Error getting roles for LDAP groups: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Assign roles to user based on LDAP groups
   * Creates UserRole entries with source set to LDAP_MAPPING
   */
  async assignRolesToUserFromLdap(userId: string, roles: Role[]): Promise<UserRole[]> {
    try {
      if (!roles || roles.length === 0) {
        return [];
      }
      
      this.logger.debug(`Assigning ${roles.length} LDAP-mapped roles to user ${userId}`);
      
      // First, remove any existing LDAP-mapped roles to prevent duplicates
      await this.userRoleRepository.delete({
        userId,
        source: UserRoleSource.LDAP_MAPPING
      });
      
      // Create new UserRole entries for each role
      const userRoles = roles.map(role => {
        return this.userRoleRepository.create({
          userId,
          roleId: role.id,
          source: UserRoleSource.LDAP_MAPPING
        });
      });
      
      // Save all user roles
      const savedUserRoles = await this.userRoleRepository.save(userRoles);
      this.logger.debug(`Assigned ${savedUserRoles.length} LDAP-mapped roles to user ${userId}`);
      
      return savedUserRoles;
    } catch (error) {
      this.logger.error(`Error assigning LDAP-mapped roles to user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Map LDAP group to role
   */
  async mapLdapGroupToRole(ldapGroup: string, roleId: string): Promise<LdapRoleMapping> {
    try {
      // Create mapping using only required fields that exist in the entity
      const mapping = this.ldapRoleMappingRepository.create();
      
      // Set required properties manually
      mapping.ldapGroupDN = ldapGroup;
      mapping.ldapGroupName = ldapGroup.split(',')[0].replace('CN=', ''); // Simple name extraction
      mapping.roleId = roleId;
      mapping.mappingType = LdapMappingType.GROUP;
      mapping.ldapConfigurationId = '00000000-0000-0000-0000-000000000000'; // Default config ID placeholder
      
      // Save the entity
      const savedMapping = await this.ldapRoleMappingRepository.save(mapping);
      
      // Return the saved entity with type assurance
      return savedMapping;
    } catch (error) {
      this.logger.error(`Error mapping LDAP group ${ldapGroup} to role ${roleId}: ${error.message}`);
      throw error;
    }
  }
} 