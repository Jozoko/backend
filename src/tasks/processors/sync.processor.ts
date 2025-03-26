import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES } from '../services/queue.service';
import { LdapSyncService } from '../../auth/services/ldap-sync.service';

@Processor(QUEUES.SYNC)
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly ldapSyncService: LdapSyncService) {}

  @Process('ldap-sync')
  async handleLdapSync(job: Job<any>): Promise<any> {
    try {
      this.logger.log(`Processing LDAP sync task: ${job.id}`);
      
      // Process job data
      const { configId, options } = job.data;
      this.logger.debug(`Syncing LDAP for config: ${configId}`);
      
      // Execute sync using LdapSyncService
      const result = await this.ldapSyncService.executeSyncById(configId, options);
      
      this.logger.log(`Completed LDAP sync task: ${job.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error syncing LDAP ${job.id}: ${error.message}`);
      throw error;
    }
  }

  @Process('role-mapping-sync')
  async handleRoleMappingSync(job: Job<any>): Promise<any> {
    try {
      this.logger.log(`Processing role mapping sync task: ${job.id}`);
      
      // Process job data
      const { configId, options } = job.data;
      
      // For now, we'll just delegate to the LDAP sync service with a scope override
      if (configId) {
        const result = await this.ldapSyncService.executeSyncById(configId, {
          ...options,
          scope: 'groups',
        });
        
        this.logger.log(`Completed role mapping sync task: ${job.id}`);
        return result;
      }
      
      this.logger.log(`Completed role mapping sync task: ${job.id}`);
      return { 
        success: true,
        syncedAt: new Date(),
        mappingsUpdated: 0,
      };
    } catch (error) {
      this.logger.error(`Error syncing role mappings ${job.id}: ${error.message}`);
      throw error;
    }
  }
} 