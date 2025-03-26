import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUES } from '../services/queue.service';

interface SendMailData {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
}

@Processor(QUEUES.MAIL)
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  @Process('send-mail')
  async handleSendMail(job: Job<SendMailData>): Promise<any> {
    try {
      this.logger.log(`Processing send mail task: ${job.id}`);
      
      // Process job data
      const { to, subject } = job.data;
      this.logger.debug(`Sending mail to: ${to}, subject: ${subject}`);
      
      // Simulate sending email
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      this.logger.log(`Completed send mail task: ${job.id}`);
      return { 
        success: true, 
        to,
        subject,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error sending mail ${job.id}: ${error.message}`);
      throw error;
    }
  }

  @Process('send-notification')
  async handleSendNotification(job: Job<any>): Promise<any> {
    try {
      this.logger.log(`Processing send notification task: ${job.id}`);
      
      // Process job data
      const { userId, message, type } = job.data;
      this.logger.debug(`Sending notification to user ${userId}: ${message} (${type})`);
      
      // Simulate sending notification
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      this.logger.log(`Completed send notification task: ${job.id}`);
      return { 
        success: true, 
        userId,
        type,
        sentAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error sending notification ${job.id}: ${error.message}`);
      throw error;
    }
  }
} 