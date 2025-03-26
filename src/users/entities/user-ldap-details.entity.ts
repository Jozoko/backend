import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { LdapConfiguration } from '../../auth/entities/ldap-configuration.entity';

@Entity('user_ldap_details')
export class UserLdapDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.ldapDetails)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => LdapConfiguration)
  @JoinColumn({ name: 'ldapConfigurationId' })
  ldapConfiguration: LdapConfiguration;

  @Column()
  ldapConfigurationId: string;

  @Column()
  distinguishedName: string;

  @Column({ nullable: true })
  samAccountName: string;

  @Column({ nullable: true })
  userPrincipalName: string;

  @Column()
  objectGUID: string;

  @Column('simple-array')
  groups: string[];

  @Column({ type: 'timestamp' })
  lastSyncAt: Date;

  @Column({ type: 'jsonb' })
  rawData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 