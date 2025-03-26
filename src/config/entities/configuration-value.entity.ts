import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ConfigurationKey } from './configuration-key.entity';

@Entity('configuration_values')
export class ConfigurationValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ConfigurationKey, (configKey) => configKey.values)
  @JoinColumn({ name: 'configKeyId' })
  configKey: ConfigurationKey;

  @Column()
  configKeyId: string;

  @Column()
  value: string;

  @Column({ nullable: true })
  environmentName: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 