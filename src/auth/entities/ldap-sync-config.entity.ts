import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LdapConfiguration } from './ldap-configuration.entity';

export enum SyncScope {
  USERS = 'users',
  GROUPS = 'groups',
  BOTH = 'both',
}

export enum ConflictPolicy {
  LDAP_WINS = 'ldap_wins',
  LOCAL_WINS = 'local_wins',
  SELECTIVE = 'selective',
}

export enum SyncFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

@Entity('ldap_sync_configs')
export class LdapSyncConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SyncFrequency,
    default: SyncFrequency.DAILY,
  })
  frequency: SyncFrequency;

  @Column({ nullable: true })
  cronExpression: string;

  @Column({
    type: 'enum',
    enum: SyncScope,
    default: SyncScope.BOTH,
  })
  scope: SyncScope;

  @Column({
    type: 'enum',
    enum: ConflictPolicy,
    default: ConflictPolicy.LDAP_WINS,
  })
  conflictPolicy: ConflictPolicy;

  @Column({ type: 'jsonb', nullable: true })
  fieldExceptions: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 100 })
  batchSize: number;

  @Column({ nullable: true })
  lastSyncAt: Date;

  @Column({ nullable: true })
  nextSyncAt: Date;

  @Column({ default: 0 })
  syncCount: number;

  @Column({ type: 'jsonb', nullable: true })
  lastSyncStats: Record<string, any>;

  @ManyToOne(() => LdapConfiguration)
  @JoinColumn({ name: 'ldapConfigurationId' })
  ldapConfiguration: LdapConfiguration;

  @Column()
  ldapConfigurationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 