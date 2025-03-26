import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES } from '../services/queue.service';

@Processor(QUEUES.SYNC)
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name);

  @Process('ldap-sync')
  async handleLdapSync(job: Job<any>): Promise<any> {
    try {
      this.logger.log(`Processing LDAP sync task: ${job.id}`);
      
      // Process job data
      const { configurationId } = job.data;
      this.logger.debug(`Syncing LDAP for configuration: ${configurationId}`);
      
      // Simulate LDAP sync
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      this.logger.log(`Completed LDAP sync task: ${job.id}`);
      return { 
        success: true, 
        configurationId,
        syncedAt: new Date(),
        usersUpdated: Math.floor(Math.random() * 10) + 1, // Simulate 1-10 users updated
      };
    } catch (error) {
      this.logger.error(`Error syncing LDAP ${job.id}: ${error.message}`);
      throw error;
    }
  }

  @Process('role-mapping-sync')
  async handleRoleMappingSync(job: Job<any>): Promise<any> {
    try {
      this.logger.log(`Processing role mapping sync task: ${job.id}`);
      
      // Simulate role mapping sync
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      this.logger.log(`Completed role mapping sync task: ${job.id}`);
      return { 
        success: true,
        syncedAt: new Date(),
        mappingsUpdated: Math.floor(Math.random() * 5) + 1, // Simulate 1-5 mappings updated
      };
    } catch (error) {
      this.logger.error(`Error syncing role mappings ${job.id}: ${error.message}`);
      throw error;
    }
  }
} 