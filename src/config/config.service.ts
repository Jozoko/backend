import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationKey, ConfigurationDataType } from './entities/configuration-key.entity';
import { ConfigurationValue } from './entities/configuration-value.entity';
import { ConfigurationCategory } from './entities/configuration-category.entity';

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly logger = new Logger(ConfigService.name);
  private cache: Map<string, any> = new Map();

  constructor(
    private readonly nestConfigService: NestConfigService,
    @InjectRepository(ConfigurationKey)
    private readonly configKeyRepository: Repository<ConfigurationKey>,
    @InjectRepository(ConfigurationValue)
    private readonly configValueRepository: Repository<ConfigurationValue>,
    @InjectRepository(ConfigurationCategory)
    private readonly configCategoryRepository: Repository<ConfigurationCategory>,
  ) {}

  async onModuleInit() {
    // Load all configurations from database into cache
    await this.refreshCache();
  }

  async refreshCache(): Promise<void> {
    this.logger.log('Refreshing configuration cache...');
    
    try {
      // Get all active configuration values
      const values = await this.configValueRepository.find({
        where: { isActive: true },
        relations: ['configKey'],
      });

      // Clear existing cache
      this.cache.clear();

      // Add values to cache
      for (const value of values) {
        const key = value.configKey.key;
        let parsedValue = value.value;

        // Convert value based on type
        switch (value.configKey.dataType) {
          case ConfigurationDataType.NUMBER:
            parsedValue = Number(parsedValue);
            break;
          case ConfigurationDataType.BOOLEAN:
            parsedValue = parsedValue === 'true';
            break;
          case ConfigurationDataType.JSON:
            try {
              parsedValue = JSON.parse(parsedValue);
            } catch (error) {
              this.logger.error(`Failed to parse JSON for key ${key}: ${error.message}`);
            }
            break;
        }

        this.cache.set(key, parsedValue);
      }

      this.logger.log(`Configuration cache refreshed with ${this.cache.size} items`);
    } catch (error) {
      this.logger.error(`Failed to refresh configuration cache: ${error.message}`);
    }
  }

  /**
   * Get a configuration value from the database or environment
   */
  get<T>(key: string, defaultValue?: T): T {
    // Check if the key is in the database cache
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Fall back to environment variables if not in database
    return this.nestConfigService.get<T>(key, defaultValue);
  }

  /**
   * Set a configuration value in the database
   */
  async set(key: string, value: any, environment?: string): Promise<ConfigurationValue> {
    // Find or create the configuration key
    let configKey = await this.configKeyRepository.findOne({ where: { key } });

    if (!configKey) {
      // Try to find or create a default category
      let category = await this.configCategoryRepository.findOne({ where: { name: 'System' } });
      
      if (!category) {
        category = this.configCategoryRepository.create({
          name: 'System',
          description: 'System configuration values',
          displayOrder: 0,
        });
        await this.configCategoryRepository.save(category);
      }

      // Create the configuration key
      configKey = this.configKeyRepository.create({
        key,
        categoryId: category.id,
        dataType: typeof value === 'string' ? ConfigurationDataType.STRING
          : typeof value === 'number' ? ConfigurationDataType.NUMBER
          : typeof value === 'boolean' ? ConfigurationDataType.BOOLEAN
          : ConfigurationDataType.JSON,
      });
      
      await this.configKeyRepository.save(configKey);
    }

    // Prepare string value based on type
    let stringValue: string;
    if (typeof value === 'object') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    // Find existing value for this key and environment
    let configValue = await this.configValueRepository.findOne({
      where: {
        configKeyId: configKey.id,
        environmentName: environment || null,
      },
    });

    if (configValue) {
      // Update existing value
      configValue.value = stringValue;
    } else {
      // Create new value
      configValue = this.configValueRepository.create({
        configKeyId: configKey.id,
        value: stringValue,
        environmentName: environment,
        isActive: true,
      });
    }

    // Save the value
    await this.configValueRepository.save(configValue);

    // Update cache
    if (!environment || environment === process.env.NODE_ENV) {
      this.cache.set(key, value);
    }

    return configValue;
  }

  /**
   * Get all configuration keys and values
   */
  async getAllConfigurations(): Promise<any[]> {
    const keys = await this.configKeyRepository.find({
      relations: ['category', 'values'],
    });

    return keys.map(key => {
      const value = key.values.find(v => v.isActive && (!v.environmentName || v.environmentName === process.env.NODE_ENV));
      
      let parsedValue = value?.value;
      if (parsedValue && key.dataType === ConfigurationDataType.JSON) {
        try {
          parsedValue = JSON.parse(parsedValue);
        } catch (error) {
          // Use as is if parsing fails
        }
      } else if (parsedValue && key.dataType === ConfigurationDataType.NUMBER) {
        parsedValue = Number(parsedValue);
      } else if (parsedValue && key.dataType === ConfigurationDataType.BOOLEAN) {
        parsedValue = parsedValue === 'true';
      }

      return {
        id: key.id,
        key: key.key,
        category: key.category.name,
        dataType: key.dataType,
        value: parsedValue,
        defaultValue: key.defaultValue,
        isEditable: key.isEditable,
        description: key.description,
      };
    });
  }

  /**
   * Get configuration by category
   */
  async getConfigurationsByCategory(categoryName: string): Promise<any[]> {
    const category = await this.configCategoryRepository.findOne({
      where: { name: categoryName },
    });

    if (!category) {
      return [];
    }

    const keys = await this.configKeyRepository.find({
      where: { categoryId: category.id },
      relations: ['values'],
    });

    return keys.map(key => {
      const value = key.values.find(v => v.isActive && (!v.environmentName || v.environmentName === process.env.NODE_ENV));
      
      return {
        id: key.id,
        key: key.key,
        dataType: key.dataType,
        value: value?.value,
        defaultValue: key.defaultValue,
        isEditable: key.isEditable,
        description: key.description,
      };
    });
  }

  /**
   * Delete a configuration value
   */
  async delete(key: string, environment?: string): Promise<boolean> {
    const configKey = await this.configKeyRepository.findOne({ where: { key } });
    
    if (!configKey) {
      return false;
    }

    const configValue = await this.configValueRepository.findOne({
      where: {
        configKeyId: configKey.id,
        environmentName: environment || null,
      },
    });

    if (!configValue) {
      return false;
    }

    // Soft delete by setting isActive to false
    configValue.isActive = false;
    await this.configValueRepository.save(configValue);

    // Remove from cache
    this.cache.delete(key);

    return true;
  }
} 