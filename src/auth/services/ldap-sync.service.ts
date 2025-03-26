import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection, LessThanOrEqual } from 'typeorm';
import { LdapSyncConfig, SyncScope, ConflictPolicy } from '../entities/ldap-sync-config.entity';
import { LdapConfiguration } from '../entities/ldap-configuration.entity';
import { LdapService } from './ldap.service';
import { QueueService } from '../../tasks/services/queue.service';
import { UserService } from '../../users/services/user.service';
import { RolesService } from '../../roles/services/roles.service';
import { AuditService } from '../../common/services/audit.service';

interface SyncOptions {
  fullSync?: boolean;
  batchSize?: number;
  conflictPolicy?: ConflictPolicy;
  scope?: SyncScope;
  fieldExceptions?: string[];
}

interface SyncResult {
  success: boolean;
  startTime: Date;
  endTime: Date | null;
  usersProcessed: number;
  usersCreated: number;
  usersUpdated: number;
  usersSkipped: number;
  errors: string[];
}

@Injectable()
export class LdapSyncService {
  private readonly logger = new Logger(LdapSyncService.name);

  constructor(
    @InjectRepository(LdapSyncConfig)
    private readonly ldapSyncConfigRepository: Repository<LdapSyncConfig>,
    @InjectRepository(LdapConfiguration)
    private readonly ldapConfigurationRepository: Repository<LdapConfiguration>,
    private readonly ldapService: LdapService,
    private readonly queueService: QueueService,
    private readonly userService: UserService,
    private readonly rolesService: RolesService,
    private readonly auditService: AuditService,
    private readonly connection: Connection,
  ) {}

  /**
   * Get all LDAP sync configurations
   */
  async getAllConfigurations(): Promise<LdapSyncConfig[]> {
    return this.ldapSyncConfigRepository.find({
      relations: ['ldapConfiguration'],
    });
  }

  /**
   * Get LDAP sync configuration by ID
   */
  async getConfigurationById(id: string): Promise<LdapSyncConfig> {
    const config = await this.ldapSyncConfigRepository.findOne({
      where: { id },
      relations: ['ldapConfiguration'],
    });
    
    if (!config) {
      throw new NotFoundException(`LDAP sync configuration with ID ${id} not found`);
    }
    
    return config;
  }

  /**
   * Create a new LDAP sync configuration
   */
  async createConfiguration(data: Partial<LdapSyncConfig>): Promise<LdapSyncConfig> {
    const config = this.ldapSyncConfigRepository.create(data);
    
    // Calculate next sync time based on frequency or cron expression
    config.nextSyncAt = this.calculateNextSyncTime(config);
    
    const saved = await this.ldapSyncConfigRepository.save(config);
    
    // Add to queue system if active
    if (saved.isActive) {
      await this.scheduleSync(saved);
    }
    
    return saved;
  }

  /**
   * Update an LDAP sync configuration
   */
  async updateConfiguration(id: string, data: Partial<LdapSyncConfig>): Promise<LdapSyncConfig> {
    await this.ldapSyncConfigRepository.update(id, data);
    
    const updated = await this.getConfigurationById(id);
    
    // If schedule changed, update next sync time
    if (data.frequency || data.cronExpression) {
      updated.nextSyncAt = this.calculateNextSyncTime(updated);
      await this.ldapSyncConfigRepository.save(updated);
    }
    
    // Update in queue system if active status changed
    if (data.isActive !== undefined) {
      if (data.isActive) {
        await this.scheduleSync(updated);
      } else {
        // TODO: Remove from queue if needed
      }
    }
    
    return updated;
  }

  /**
   * Delete an LDAP sync configuration
   */
  async deleteConfiguration(id: string): Promise<boolean> {
    const result = await this.ldapSyncConfigRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }

  /**
   * Calculate next sync time based on frequency or cron
   */
  private calculateNextSyncTime(config: LdapSyncConfig): Date {
    const now = new Date();
    let next = new Date();
    
    switch (config.frequency) {
      case 'hourly':
        next.setHours(now.getHours() + 1);
        break;
      case 'daily':
        next.setDate(now.getDate() + 1);
        next.setHours(2, 0, 0, 0); // 2:00 AM
        break;
      case 'weekly':
        next.setDate(now.getDate() + (7 - now.getDay()));
        next.setHours(2, 0, 0, 0); // 2:00 AM Sunday
        break;
      case 'monthly':
        next.setMonth(now.getMonth() + 1);
        next.setDate(1);
        next.setHours(2, 0, 0, 0); // 2:00 AM on the 1st
        break;
      case 'custom':
        // For custom, we would need to parse the cron expression
        // This is a placeholder - would use a cron parser library
        next.setDate(now.getDate() + 1);
        break;
    }
    
    return next;
  }

  /**
   * Schedule sync in queue system
   */
  private async scheduleSync(config: LdapSyncConfig): Promise<void> {
    try {
      // Calculate delay until next sync
      const now = new Date();
      const nextSync = config.nextSyncAt || this.calculateNextSyncTime(config);
      const delayMs = Math.max(0, nextSync.getTime() - now.getTime());
      
      // Add to sync queue with delay
      await this.queueService.addToSyncQueue('ldap-sync', {
        configId: config.id,
        ldapConfigurationId: config.ldapConfigurationId,
        options: {
          fullSync: false,
          batchSize: config.batchSize,
          conflictPolicy: config.conflictPolicy,
          scope: config.scope,
          fieldExceptions: config.fieldExceptions,
        },
      }, {
        delay: delayMs,
        jobId: `ldap-sync:${config.id}:${Date.now()}`,
      });
      
      this.logger.log(`Scheduled LDAP sync for config ${config.name} at ${nextSync.toISOString()}`);
    } catch (error) {
      this.logger.error(`Error scheduling LDAP sync: ${error.message}`);
    }
  }

  /**
   * Find all configurations due for sync and schedule them
   */
  async schedulePendingSyncs(): Promise<void> {
    try {
      const dueConfigs = await this.ldapSyncConfigRepository.find({
        where: {
          isActive: true,
          nextSyncAt: LessThanOrEqual(new Date()),
        },
        relations: ['ldapConfiguration'],
      });
      
      this.logger.log(`Found ${dueConfigs.length} LDAP sync configurations due for processing`);
      
      for (const config of dueConfigs) {
        await this.scheduleSync(config);
      }
    } catch (error) {
      this.logger.error(`Error scheduling pending LDAP syncs: ${error.message}`);
    }
  }

  /**
   * Execute the LDAP synchronization
   */
  async executeSyncById(syncConfigId: string, options?: SyncOptions): Promise<SyncResult> {
    const syncConfig = await this.getConfigurationById(syncConfigId);
    
    if (!syncConfig.ldapConfiguration) {
      throw new Error(`LDAP configuration not found for sync config ${syncConfigId}`);
    }
    
    return this.executeSync(syncConfig, options);
  }

  /**
   * Execute the LDAP synchronization with given configuration
   */
  async executeSync(
    syncConfig: LdapSyncConfig,
    options?: SyncOptions
  ): Promise<SyncResult> {
    const startTime = new Date();
    const result: SyncResult = {
      success: false,
      startTime,
      endTime: null,
      usersProcessed: 0,
      usersCreated: 0,
      usersUpdated: 0,
      usersSkipped: 0,
      errors: [],
    };
    
    try {
      this.logger.log(`Starting LDAP sync for config: ${syncConfig.name}`);
      
      const ldapConfig = syncConfig.ldapConfiguration;
      
      // Configure options, using defaults from sync config if not provided
      const syncOptions: SyncOptions = {
        fullSync: options?.fullSync ?? false, 
        batchSize: options?.batchSize ?? syncConfig.batchSize,
        conflictPolicy: options?.conflictPolicy ?? syncConfig.conflictPolicy,
        scope: options?.scope ?? syncConfig.scope,
        fieldExceptions: options?.fieldExceptions ?? syncConfig.fieldExceptions,
      };
      
      // TODO: Implement the actual sync with batching
      // This is a placeholder for the actual implementation
      
      // Get the latest config to update
      const configToUpdate = await this.getConfigurationById(syncConfig.id);
      
      // Update the config properties
      configToUpdate.lastSyncAt = new Date();
      configToUpdate.nextSyncAt = this.calculateNextSyncTime(configToUpdate);
      configToUpdate.syncCount += 1;
      configToUpdate.lastSyncStats = {
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString(),
        usersProcessed: result.usersProcessed,
        usersCreated: result.usersCreated,
        usersUpdated: result.usersUpdated,
        usersSkipped: result.usersSkipped,
        errors: result.errors,
      };
      
      // Save the updated config
      await this.ldapSyncConfigRepository.save(configToUpdate);
      
      result.success = true;
      result.endTime = new Date();
      
      return result;
    } catch (error) {
      this.logger.error(`Error executing LDAP sync: ${error.message}`);
      result.success = false;
      result.endTime = new Date();
      result.errors.push(error.message);
      
      try {
        // Get the latest config to update
        const configToUpdate = await this.getConfigurationById(syncConfig.id);
        
        // Update the config properties for error case
        configToUpdate.lastSyncAt = new Date();
        configToUpdate.nextSyncAt = this.calculateNextSyncTime(configToUpdate);
        configToUpdate.lastSyncStats = {
          startTime: startTime.toISOString(),
          endTime: new Date().toISOString(),
          error: error.message,
          success: false,
        };
        
        // Save the updated config
        await this.ldapSyncConfigRepository.save(configToUpdate);
      } catch (saveError) {
        this.logger.error(`Failed to update sync status: ${saveError.message}`);
      }
      
      return result;
    }
  }

  /**
   * Trigger immediate synchronization
   */
  async triggerSyncNow(syncConfigId: string, options?: SyncOptions): Promise<void> {
    await this.queueService.addToSyncQueue('ldap-sync', {
      configId: syncConfigId,
      options: {
        ...options,
        fullSync: options?.fullSync ?? true,
      },
    });
    
    this.logger.log(`Triggered immediate LDAP sync for config ID: ${syncConfigId}`);
  }
} 