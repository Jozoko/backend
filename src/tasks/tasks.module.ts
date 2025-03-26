import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { QueueService, QUEUES } from './services/queue.service';
import { SchedulerService } from './services/scheduler.service';
import { DefaultProcessor } from './processors/default.processor';
import { SyncProcessor } from './processors/sync.processor';
import { MailProcessor } from './processors/mail.processor';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

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
    // Register scheduling module
    ScheduleModule.forRoot(),
    // Import required modules
    AuthModule,
    UsersModule,
    RolesModule,
  ],
  providers: [
    QueueService,
    SchedulerService,
    DefaultProcessor,
    SyncProcessor,
    MailProcessor,
  ],
  exports: [QueueService, SchedulerService],
})
export class TasksModule {} 