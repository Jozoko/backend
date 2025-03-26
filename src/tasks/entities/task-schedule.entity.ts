import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TaskDefinition } from './task-definition.entity';
import { TaskExecution } from './task-execution.entity';

@Entity('task_schedules')
export class TaskSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TaskDefinition, (taskDefinition) => taskDefinition.schedules)
  @JoinColumn({ name: 'taskDefinitionId' })
  taskDefinition: TaskDefinition;

  @Column()
  taskDefinitionId: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  cronExpression: string;

  @Column({ type: 'jsonb', default: {} })
  parameters: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  lastRunAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  nextRunAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TaskExecution, (execution) => execution.schedule)
  executions: TaskExecution[];
} 