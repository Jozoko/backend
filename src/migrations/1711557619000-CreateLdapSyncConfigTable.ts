import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateLdapSyncConfigTable1711557619000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First create the enum types
    await queryRunner.query(`
      CREATE TYPE "sync_scope_enum" AS ENUM('users', 'groups', 'both');
    `);
    await queryRunner.query(`
      CREATE TYPE "conflict_policy_enum" AS ENUM('ldap_wins', 'local_wins', 'selective');
    `);
    await queryRunner.query(`
      CREATE TYPE "sync_frequency_enum" AS ENUM('hourly', 'daily', 'weekly', 'monthly', 'custom');
    `);

    // Then create the table
    await queryRunner.createTable(
      new Table({
        name: 'ldap_sync_configs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'frequency',
            type: 'sync_frequency_enum',
            default: "'daily'",
          },
          {
            name: 'cron_expression',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'scope',
            type: 'sync_scope_enum',
            default: "'both'",
          },
          {
            name: 'conflict_policy',
            type: 'conflict_policy_enum',
            default: "'ldap_wins'",
          },
          {
            name: 'field_exceptions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'batch_size',
            type: 'integer',
            default: 100,
          },
          {
            name: 'last_sync_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'next_sync_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'sync_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_sync_stats',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ldap_configuration_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    // Add foreign key
    await queryRunner.createForeignKey(
      'ldap_sync_configs',
      new TableForeignKey({
        columnNames: ['ldap_configuration_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'ldap_configurations',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ldap_sync_configs');
    await queryRunner.query(`DROP TYPE "sync_scope_enum"`);
    await queryRunner.query(`DROP TYPE "conflict_policy_enum"`);
    await queryRunner.query(`DROP TYPE "sync_frequency_enum"`);
  }
} 