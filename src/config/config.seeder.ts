import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from './config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationCategory } from './entities/configuration-category.entity';
import { ConfigurationDataType } from './entities/configuration-key.entity';

@Injectable()
export class ConfigSeeder implements OnModuleInit {
  private readonly logger = new Logger(ConfigSeeder.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ConfigurationCategory)
    private readonly categoryRepository: Repository<ConfigurationCategory>,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing configuration seeder...');
    await this.seedCategories();
    await this.seedInitialConfigurations();
  }

  async seedCategories() {
    const categories = [
      {
        name: 'System',
        description: 'System-wide configurations',
        displayOrder: 0,
      },
      {
        name: 'Authentication',
        description: 'Authentication related configurations',
        displayOrder: 1,
      },
      {
        name: 'LDAP',
        description: 'LDAP connection configurations',
        displayOrder: 2,
      },
      {
        name: 'Email',
        description: 'Email configurations',
        displayOrder: 3,
      },
      {
        name: 'UI',
        description: 'User interface configurations',
        displayOrder: 4,
      },
    ];

    for (const category of categories) {
      const existing = await this.categoryRepository.findOne({
        where: { name: category.name },
      });

      if (!existing) {
        await this.categoryRepository.save(this.categoryRepository.create(category));
        this.logger.log(`Created category: ${category.name}`);
      }
    }
  }

  async seedInitialConfigurations() {
    // System configurations
    await this.setConfigIfNotExists(
      'system.name',
      'Innosec Portal',
      'System',
      'Application name',
      ConfigurationDataType.STRING,
    );

    await this.setConfigIfNotExists(
      'system.maintenance_mode',
      false,
      'System',
      'Enable maintenance mode',
      ConfigurationDataType.BOOLEAN,
    );

    // Authentication configurations
    await this.setConfigIfNotExists(
      'auth.session_duration',
      '1d',
      'Authentication',
      'Default session duration',
      ConfigurationDataType.STRING,
    );

    await this.setConfigIfNotExists(
      'auth.lockout_threshold',
      5,
      'Authentication',
      'Number of failed attempts before account lockout',
      ConfigurationDataType.NUMBER,
    );

    await this.setConfigIfNotExists(
      'auth.lockout_duration',
      30,
      'Authentication',
      'Lockout duration in minutes',
      ConfigurationDataType.NUMBER,
    );

    // LDAP configurations
    await this.setConfigIfNotExists(
      'ldap.sync_schedule',
      '0 0 * * *',
      'LDAP',
      'CRON schedule for LDAP synchronization',
      ConfigurationDataType.STRING,
    );

    await this.setConfigIfNotExists(
      'ldap.default_mapping_type',
      'group',
      'LDAP',
      'Default LDAP mapping type (group or ou)',
      ConfigurationDataType.STRING,
    );

    // UI configurations
    await this.setConfigIfNotExists(
      'ui.default_theme',
      'light',
      'UI',
      'Default theme',
      ConfigurationDataType.STRING,
    );

    await this.setConfigIfNotExists(
      'ui.default_language',
      'en',
      'UI',
      'Default language',
      ConfigurationDataType.STRING,
    );

    await this.setConfigIfNotExists(
      'ui.available_languages',
      ['en', 'ru'],
      'UI',
      'Available languages',
      ConfigurationDataType.JSON,
    );

    await this.setConfigIfNotExists(
      'ui.available_themes',
      ['light', 'dark'],
      'UI',
      'Available themes',
      ConfigurationDataType.JSON,
    );
  }

  private async setConfigIfNotExists(
    key: string,
    value: any,
    categoryName: string,
    description: string,
    dataType: ConfigurationDataType,
  ) {
    try {
      // Try to get the configuration
      const existingValue = this.configService.get(key);

      // If it doesn't exist, create it
      if (existingValue === undefined) {
        await this.configService.set(key, value);

        // Find the key to update additional properties
        const category = await this.categoryRepository.findOne({
          where: { name: categoryName },
        });

        if (category) {
          const configKey = await this.configService['configKeyRepository'].findOne({
            where: { key },
          });

          if (configKey) {
            configKey.description = description;
            configKey.dataType = dataType;
            configKey.categoryId = category.id;
            await this.configService['configKeyRepository'].save(configKey);
          }
        }

        this.logger.log(`Created configuration: ${key}`);
      }
    } catch (error) {
      this.logger.error(`Failed to seed configuration ${key}: ${error.message}`);
    }
  }
} 