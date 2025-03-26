import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES } from '../services/queue.service';

@Processor(QUEUES.DEFAULT)
export class DefaultProcessor {
  private readonly logger = new Logger(DefaultProcessor.name);

  @Process('generic-task')
  async handleGenericTask(job: Job<any>): Promise<any> {
    try {
      this.logger.log(`Processing generic task: ${job.id}`);
      
      // Process job data
      const { data } = job;
      this.logger.debug(`Task data: ${JSON.stringify(data)}`);
      
      // Simulate task execution
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      this.logger.log(`Completed generic task: ${job.id}`);
      return { success: true, jobId: job.id };
    } catch (error) {
      this.logger.error(`Error processing generic task ${job.id}: ${error.message}`);
      throw error;
    }
  }

  @Process('refresh-cache')
  async handleRefreshCache(job: Job<any>): Promise<any> {
    try {
      this.logger.log(`Processing refresh cache task: ${job.id}`);
      
      // Process job data
      const { key } = job.data;
      this.logger.debug(`Refreshing cache for key: ${key}`);
      
      // Simulate cache refresh
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      this.logger.log(`Completed refresh cache task: ${job.id}`);
      return { success: true, refreshedKey: key };
    } catch (error) {
      this.logger.error(`Error refreshing cache ${job.id}: ${error.message}`);
      throw error;
    }
  }
} 