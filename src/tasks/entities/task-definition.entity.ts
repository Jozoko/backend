import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TaskSchedule } from './task-schedule.entity';
import { TaskExecution } from './task-execution.entity';

@Entity('task_definitions')
export class TaskDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  handlerName: string;

  @Column({ type: 'jsonb', nullable: true })
  parameterSchema: Record<string, any>;

  @Column({ default: 0 })
  defaultPriority: number;

  @Column({ default: true })
  allowUserInitiated: boolean;

  @Column({ default: 1 })
  concurrencyLimit: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TaskSchedule, (schedule) => schedule.taskDefinition)
  schedules: TaskSchedule[];

  @OneToMany(() => TaskExecution, (execution) => execution.taskDefinition)
  executions: TaskExecution[];
} 