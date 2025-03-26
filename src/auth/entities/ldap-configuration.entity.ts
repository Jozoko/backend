import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserLdapDetails } from '../../users/entities/user-ldap-details.entity';
import { LdapRoleMapping } from '../../roles/entities/ldap-role-mapping.entity';
import { User } from '../../users/entities/user.entity';

@Entity('ldap_configurations')
export class LdapConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  host: string;

  @Column()
  port: number;

  @Column()
  baseDN: string;

  @Column()
  bindDN: string;

  @Column({ select: false })
  bindCredentials: string;

  @Column()
  searchFilter: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  useTLS: boolean;

  @Column({ nullable: true })
  tlsCertPath: string;

  @Column({ nullable: true })
  usernameSuffix: string;

  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, string>;

  @Column()
  syncSchedule: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.ldapConfiguration)
  users: User[];

  @OneToMany(() => UserLdapDetails, (userLdapDetails) => userLdapDetails.ldapConfiguration)
  userLdapDetails: UserLdapDetails[];

  @OneToMany(() => LdapRoleMapping, (ldapRoleMapping) => ldapRoleMapping.ldapConfiguration)
  roleMappings: LdapRoleMapping[];
} 