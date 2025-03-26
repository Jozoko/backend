import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserLdapDetails } from '../entities';
import { BaseRepository } from '../../common/services/base.repository';
import { AuditService } from '../../common/services/audit.service';
import { RolesService } from '../../roles/services/roles.service';

@Injectable()
export class UserService extends BaseRepository<User> {
  protected readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @InjectRepository(UserLdapDetails)
    private readonly userLdapDetailsRepository: Repository<UserLdapDetails>,
    
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly rolesService: RolesService,
  ) {
    super(userRepository);
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { username },
      relations: ['userRoles', 'userRoles.role', 'preferences', 'ldapDetails', 'ldapConfiguration'],
    });
  }

  /**
   * Create or update user from LDAP
   */
  async createOrUpdateFromLdap(ldapUser: any, ldapConfigurationId: string): Promise<User> {
    // Start a transaction to ensure database consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    
    try {
      // Check if user already exists
      let user = await this.findByUsername(ldapUser.username);
      
      // LDAP groups for role mapping
      const ldapGroups = Array.isArray(ldapUser.memberOf) 
        ? ldapUser.memberOf 
        : (ldapUser.memberOf ? [ldapUser.memberOf] : []);
      
      this.logger.debug(`LDAP user has ${ldapGroups.length} groups: ${ldapGroups.join(', ')}`);
      
      if (user) {
        // Update existing user
        const oldValues = { ...user };
        
        user.displayName = ldapUser.displayName;
        user.email = ldapUser.email;
        user.lastLoginAt = new Date();
        user.ldapConfigurationId = ldapConfigurationId;
        
        await this.userRepository.save(user);
        
        // Update LDAP details
        if (user.ldapDetails && user.ldapDetails.length > 0) {
          // Find the first LDAP details record
          const ldapDetail = user.ldapDetails[0];
          
          // Update the LDAP details
          ldapDetail.distinguishedName = ldapUser.ldapDn;
          ldapDetail.lastSyncAt = new Date();
          
          // If additional properties from LDAP are available, update them
          if (ldapUser.samAccountName) {
            ldapDetail.samAccountName = ldapUser.samAccountName;
          }
          if (ldapUser.userPrincipalName) {
            ldapDetail.userPrincipalName = ldapUser.userPrincipalName;
          }
          if (ldapUser.objectGUID) {
            ldapDetail.objectGUID = ldapUser.objectGUID;
          }
          
          // Update groups
          ldapDetail.groups = ldapGroups;
          
          if (ldapUser.rawData) {
            ldapDetail.rawData = ldapUser.rawData;
          }
          
          await this.userLdapDetailsRepository.save(ldapDetail);
        } else {
          // Create LDAP details if they don't exist
          const ldapDetails = this.userLdapDetailsRepository.create({
            userId: user.id,
            ldapConfigurationId: ldapConfigurationId,
            distinguishedName: ldapUser.ldapDn,
            objectGUID: ldapUser.objectGUID || 'unknown',
            groups: ldapGroups,
            lastSyncAt: new Date(),
            rawData: ldapUser.rawData || {},
          });
          
          await this.userLdapDetailsRepository.save(ldapDetails);
        }
        
        // Map LDAP groups to roles and assign to user
        const roles = await this.rolesService.getRolesByLdapGroups(ldapGroups, ldapConfigurationId);
        if (roles.length > 0) {
          this.logger.debug(`Assigning ${roles.length} roles to user ${user.id} based on LDAP groups`);
          await this.rolesService.assignRolesToUserFromLdap(user.id, roles);
        } else {
          this.logger.debug(`No roles found for user's LDAP groups, using default role`);
        }
        
        // Log update
        await this.auditService.logUpdate({
          entityType: 'user',
          entityId: user.id,
          oldValues,
          newValues: user,
        });
        
        // Commit transaction
        await queryRunner.commitTransaction();
        
        return user;
      } else {
        // Create new user
        const newUser = this.userRepository.create({
          username: ldapUser.username,
          displayName: ldapUser.displayName,
          email: ldapUser.email,
          isActive: true,
          lastLoginAt: new Date(),
          ldapConfigurationId: ldapConfigurationId,
        });
        
        // Save user
        const savedUser = await this.userRepository.save(newUser);
        
        // Create LDAP details
        const ldapDetails = this.userLdapDetailsRepository.create({
          userId: savedUser.id,
          ldapConfigurationId: ldapConfigurationId,
          distinguishedName: ldapUser.ldapDn,
          objectGUID: ldapUser.objectGUID || 'unknown',
          groups: ldapGroups,
          lastSyncAt: new Date(),
          rawData: ldapUser.rawData || {},
        });
        
        await this.userLdapDetailsRepository.save(ldapDetails);
        
        // Map LDAP groups to roles and assign to user
        const roles = await this.rolesService.getRolesByLdapGroups(ldapGroups, ldapConfigurationId);
        if (roles.length > 0) {
          this.logger.debug(`Assigning ${roles.length} roles to new user ${savedUser.id} based on LDAP groups`);
          await this.rolesService.assignRolesToUserFromLdap(savedUser.id, roles);
        } else {
          this.logger.debug(`No roles found for new user's LDAP groups, using default role`);
          // Find default user role and assign it
          const defaultRole = await this.rolesService.findOne({ where: { name: 'user' } });
          if (defaultRole) {
            await this.rolesService.assignRoleToUser(savedUser.id, defaultRole.id);
          }
        }
        
        // Log creation
        await this.auditService.logCreation({
          entityType: 'user',
          entityId: savedUser.id,
          entityData: savedUser,
        });
        
        // Commit transaction
        await queryRunner.commitTransaction();
        
        return savedUser;
      }
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      
      this.logger.error(`Error creating/updating user from LDAP: ${error.message}`);
      this.logger.debug(`Stack trace: ${error.stack}`);
      
      // Rethrow the error for the caller to handle
      throw error;
    } finally {
      // Release the query runner regardless of the outcome
      await queryRunner.release();
    }
  }

  /**
   * Get user with roles
   */
  async getUserWithRoles(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }
} 