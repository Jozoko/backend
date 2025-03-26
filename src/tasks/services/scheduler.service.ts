import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { LdapSyncService } from '../../auth/services/ldap-sync.service';

interface CronJobStatus {
  name: string;
  next: Date;
  running: boolean;
}

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly ldapSyncService: LdapSyncService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  /**
   * Initialize all scheduled tasks when the module starts
   */
  async onModuleInit() {
    try {
      this.logger.log('Initializing scheduler service');
      
      // Schedule any pending LDAP syncs
      await this.scheduleAllLdapSyncs();
      
      this.logger.log('Scheduler service initialization completed');
    } catch (error) {
      this.logger.error(`Error initializing scheduler service: ${error.message}`);
    }
  }

  /**
   * Check for LDAP synchronization tasks that need to be scheduled
   * Runs every 5 minutes to make sure we don't miss any schedules
   */
  @Cron('0 */5 * * * *')
  async checkForPendingLdapSyncs() {
    try {
      this.logger.debug('Checking for pending LDAP synchronization tasks');
      await this.ldapSyncService.schedulePendingSyncs();
    } catch (error) {
      this.logger.error(`Error checking for pending LDAP syncs: ${error.message}`);
    }
  }

  /**
   * Schedule all active LDAP synchronization tasks
   */
  private async scheduleAllLdapSyncs() {
    try {
      this.logger.log('Scheduling all active LDAP synchronization tasks');
      await this.ldapSyncService.schedulePendingSyncs();
    } catch (error) {
      this.logger.error(`Error scheduling LDAP syncs: ${error.message}`);
    }
  }

  /**
   * Get the status of the scheduler
   */
  getStatus(): any {
    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      const cronJobsArray: CronJobStatus[] = [];
      
      cronJobs.forEach((value, key) => {
        cronJobsArray.push({
          name: key,
          next: value.nextDate().toJSDate(),
          running: value.running,
        });
      });
      
      return {
        cronJobs: cronJobsArray,
      };
    } catch (error) {
      this.logger.error(`Error getting scheduler status: ${error.message}`);
      return {
        error: error.message,
      };
    }
  }
} 