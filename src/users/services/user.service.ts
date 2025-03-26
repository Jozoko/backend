import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserLdapDetails } from '../entities';
import { BaseRepository } from '../../common/services/base.repository';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class UserService extends BaseRepository<User> {
  protected readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @InjectRepository(UserLdapDetails)
    private readonly userLdapDetailsRepository: Repository<UserLdapDetails>,
    
    private readonly auditService: AuditService,
  ) {
    super(userRepository);
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { username },
      relations: ['roles', 'preferences', 'ldapDetails', 'ldapConfiguration'],
    });
  }

  /**
   * Create or update user from LDAP
   */
  async createOrUpdateFromLdap(ldapUser: any, ldapConfigurationId: string): Promise<User> {
    try {
      // Check if user already exists
      let user = await this.findByUsername(ldapUser.username);
      
      if (user) {
        // Update existing user
        const oldValues = { ...user };
        
        user.displayName = ldapUser.displayName;
        user.email = ldapUser.email;
        user.lastLoginAt = new Date();
        user.ldapConfigurationId = ldapConfigurationId;
        
        await this.userRepository.save(user);
        
        // Update LDAP details
        if (user.ldapDetails) {
          user.ldapDetails.dn = ldapUser.ldapDn;
          user.ldapDetails.lastSyncAt = new Date();
          await this.userLdapDetailsRepository.save(user.ldapDetails);
        } else {
          // Create LDAP details if they don't exist
          const ldapDetails = this.userLdapDetailsRepository.create({
            userId: user.id,
            ldapConfigurationId: ldapConfigurationId,
            dn: ldapUser.ldapDn,
            lastSyncAt: new Date(),
          });
          
          await this.userLdapDetailsRepository.save(ldapDetails);
        }
        
        // Log update
        await this.auditService.logUpdate({
          entityType: 'user',
          entityId: user.id,
          oldValues,
          newValues: user,
        });
        
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
          dn: ldapUser.ldapDn,
          lastSyncAt: new Date(),
        });
        
        await this.userLdapDetailsRepository.save(ldapDetails);
        
        // Log creation
        await this.auditService.logCreation({
          entityType: 'user',
          entityId: savedUser.id,
          entityData: savedUser,
        });
        
        return savedUser;
      }
    } catch (error) {
      this.logger.error(`Error creating/updating user from LDAP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user with roles
   */
  async getUserWithRoles(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles', 'roles.permissions'],
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }
} 