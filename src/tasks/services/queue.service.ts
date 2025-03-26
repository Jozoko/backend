import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue, JobOptions } from 'bull';

// Define queue names as constants for reuse
export const QUEUES = {
  DEFAULT: 'default',
  SYNC: 'sync',
  MAIL: 'mail',
};

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUES.DEFAULT) private readonly defaultQueue: Queue,
    @InjectQueue(QUEUES.SYNC) private readonly syncQueue: Queue,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue,
  ) {}

  /**
   * Add a job to the default queue
   */
  async addToDefaultQueue<T>(
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<void> {
    try {
      await this.defaultQueue.add(jobName, data, options);
      this.logger.log(`Added job ${jobName} to default queue`);
    } catch (error) {
      this.logger.error(`Failed to add job ${jobName} to default queue: ${error.message}`);
    }
  }

  /**
   * Add a job to the sync queue
   */
  async addToSyncQueue<T>(
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<void> {
    try {
      await this.syncQueue.add(jobName, data, options);
      this.logger.log(`Added job ${jobName} to sync queue`);
    } catch (error) {
      this.logger.error(`Failed to add job ${jobName} to sync queue: ${error.message}`);
    }
  }

  /**
   * Add a job to the mail queue
   */
  async addToMailQueue<T>(
    jobName: string,
    data: T,
    options?: JobOptions,
  ): Promise<void> {
    try {
      await this.mailQueue.add(jobName, data, options);
      this.logger.log(`Added job ${jobName} to mail queue`);
    } catch (error) {
      this.logger.error(`Failed to add job ${jobName} to mail queue: ${error.message}`);
    }
  }

  /**
   * Clear all jobs from all queues
   */
  async clearAllQueues(): Promise<void> {
    try {
      await Promise.all([
        this.defaultQueue.empty(),
        this.syncQueue.empty(),
        this.mailQueue.empty(),
      ]);
      this.logger.log('Cleared all queues');
    } catch (error) {
      this.logger.error(`Failed to clear queues: ${error.message}`);
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<any> {
    try {
      const [defaultStats, syncStats, mailStats] = await Promise.all([
        this._getQueueStats(this.defaultQueue),
        this._getQueueStats(this.syncQueue),
        this._getQueueStats(this.mailQueue),
      ]);

      return {
        default: defaultStats,
        sync: syncStats,
        mail: mailStats,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      return {};
    }
  }

  /**
   * Get statistics for a specific queue
   */
  private async _getQueueStats(queue: Queue): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }
} 