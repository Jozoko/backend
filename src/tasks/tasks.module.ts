import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService, QUEUES } from './services/queue.service';
import { DefaultProcessor } from './processors/default.processor';
import { SyncProcessor } from './processors/sync.processor';
import { MailProcessor } from './processors/mail.processor';

@Module({
  imports: [
    // Register Bull queues
    BullModule.registerQueue(
      {
        name: QUEUES.DEFAULT,
      },
      {
        name: QUEUES.SYNC,
      },
      {
        name: QUEUES.MAIL,
      },
    ),
  ],
  providers: [
    QueueService,
    DefaultProcessor,
    SyncProcessor,
    MailProcessor,
  ],
  exports: [QueueService],
})
export class TasksModule {} 