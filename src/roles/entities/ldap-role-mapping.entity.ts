import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { LdapConfiguration } from '../../auth/entities/ldap-configuration.entity';
import { Role } from './role.entity';

export enum LdapMappingType {
  GROUP = 'group',
  OU = 'ou',
}

@Entity('ldap_role_mappings')
export class LdapRoleMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LdapConfiguration, (ldapConfiguration) => ldapConfiguration.roleMappings)
  @JoinColumn({ name: 'ldapConfigurationId' })
  ldapConfiguration: LdapConfiguration;

  @Column()
  ldapConfigurationId: string;

  @ManyToOne(() => Role, (role) => role.ldapRoleMappings)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column()
  roleId: string;

  @Column()
  ldapGroupDN: string;

  @Column()
  ldapGroupName: string;

  @Column({
    type: 'enum',
    enum: LdapMappingType,
    default: LdapMappingType.GROUP,
  })
  mappingType: LdapMappingType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 