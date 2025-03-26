import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TaskDefinition } from './task-definition.entity';
import { TaskSchedule } from './task-schedule.entity';
import { User } from '../../users/entities/user.entity';

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('task_executions')
export class TaskExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TaskDefinition, (taskDefinition) => taskDefinition.executions)
  @JoinColumn({ name: 'taskDefinitionId' })
  taskDefinition: TaskDefinition;

  @Column()
  taskDefinitionId: string;

  @ManyToOne(() => TaskSchedule, (schedule) => schedule.executions, { nullable: true })
  @JoinColumn({ name: 'scheduleId' })
  schedule: TaskSchedule;

  @Column({ nullable: true })
  scheduleId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({ default: 0 })
  priority: number;

  @Column({ nullable: true, type: 'timestamp' })
  startedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  parameters: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, any>;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  attempts: number;

  @Column({ nullable: true })
  bullJobId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 