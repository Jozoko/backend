import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LdapConfiguration } from '../../auth/entities/ldap-configuration.entity';
import { UserLdapDetails } from './user-ldap-details.entity';
import { UserRole } from '../../roles/entities/user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column()
  displayName: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt: Date;

  @Column({ nullable: true })
  ldapIdentifier: string;

  @Column({ type: 'jsonb', default: {} })
  preferences: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => LdapConfiguration, { nullable: true })
  @JoinColumn({ name: 'ldapConfigurationId' })
  ldapConfiguration: LdapConfiguration;

  @Column({ nullable: true })
  ldapConfigurationId: string;

  @OneToMany(() => UserLdapDetails, (userLdapDetails) => userLdapDetails.user)
  ldapDetails: UserLdapDetails[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];
} 