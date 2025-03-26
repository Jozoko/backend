import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ConfigurationCategory } from './configuration-category.entity';
import { ConfigurationValue } from './configuration-value.entity';

export enum ConfigurationDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
  DATE = 'date',
  ENUM = 'enum',
}

@Entity('configuration_keys')
export class ConfigurationKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @ManyToOne(() => ConfigurationCategory, (category) => category.configKeys)
  @JoinColumn({ name: 'categoryId' })
  category: ConfigurationCategory;

  @Column()
  categoryId: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ConfigurationDataType,
    default: ConfigurationDataType.STRING,
  })
  dataType: ConfigurationDataType;

  @Column({ nullable: true })
  defaultValue: string;

  @Column({ type: 'jsonb', nullable: true })
  validationRules: Record<string, any>;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ default: true })
  isEditable: boolean;

  @Column({ nullable: true })
  displayName: string;

  @Column({ default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ConfigurationValue, (value) => value.configKey)
  values: ConfigurationValue[];
} 