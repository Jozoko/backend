import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// Remove ldapts imports and replace with a proper type definition
type SearchEntryObject = Record<string, any>;
import { LdapConfiguration } from '../entities';
import { CreateLdapConfigurationDto, UpdateLdapConfigurationDto } from '../dto';
import * as fs from 'fs';

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(
    @InjectRepository(LdapConfiguration)
    private ldapConfigurationRepository: Repository<LdapConfiguration>,
  ) {}

  /**
   * Get all LDAP configurations
   */
  async getAllConfigurations(): Promise<LdapConfiguration[]> {
    return this.ldapConfigurationRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Get LDAP configuration by ID
   */
  async getConfigurationById(id: string): Promise<LdapConfiguration> {
    const config = await this.ldapConfigurationRepository.findOneBy({ id });
    if (!config) {
      throw new NotFoundException(`LDAP configuration with ID ${id} not found`);
    }
    return config;
  }

  /**
   * Get default LDAP configuration
   */
  async getDefaultConfiguration(): Promise<LdapConfiguration> {
    const config = await this.ldapConfigurationRepository.findOneBy({ isDefault: true });
    if (!config) {
      throw new NotFoundException('No default LDAP configuration found');
    }
    return config;
  }

  /**
   * Create a new LDAP configuration
   */
  async createConfiguration(dto: CreateLdapConfigurationDto): Promise<LdapConfiguration> {
    // If this is the default configuration, unset other defaults
    if (dto.isDefault) {
      await this.ldapConfigurationRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    const config = this.ldapConfigurationRepository.create(dto);
    return this.ldapConfigurationRepository.save(config);
  }

  /**
   * Update an LDAP configuration
   */
  async updateConfiguration(id: string, dto: UpdateLdapConfigurationDto): Promise<LdapConfiguration> {
    // If this is being set as default, unset other defaults
    if (dto.isDefault) {
      await this.ldapConfigurationRepository.update(
        { isDefault: true },
        { isDefault: false },
      );
    }

    await this.ldapConfigurationRepository.update(id, dto);
    return this.getConfigurationById(id);
  }

  /**
   * Delete an LDAP configuration
   */
  async deleteConfiguration(id: string): Promise<boolean> {
    this.logger.debug(`Deleting LDAP configuration with ID: ${id}`);
    const result = await this.ldapConfigurationRepository.delete(id);
    return result && result.affected ? result.affected > 0 : false;
  }

  /**
   * Test LDAP connection
   * Note: With passport-ldapauth, connection testing is now handled by the strategy
   * This method provides a compatibility layer
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const config = await this.getConfigurationById(id);
      
      if (!config.isActive) {
        return { success: false, message: 'LDAP configuration is inactive' };
      }
      
      // With passport-ldapauth, we rely on the strategy for actual connection testing
      // Here we just verify the configuration exists and is valid
      if (!config.host || !config.port || !config.bindDN || !config.bindCredentials || !config.baseDN) {
        return { success: false, message: 'Missing required LDAP configuration parameters' };
      }
      
      // Check certificate file if TLS is enabled
      if (config.useTLS && config.tlsCertPath) {
        try {
          fs.accessSync(config.tlsCertPath, fs.constants.R_OK);
        } catch (err) {
          return { success: false, message: `Cannot access TLS certificate: ${err.message}` };
        }
      }
      
      return { success: true, message: 'LDAP configuration is valid' };
    } catch (error) {
      this.logger.error(`LDAP connection test failed: ${error.message}`);
      return { success: false, message: `Configuration check failed: ${error.message}` };
    }
  }

  /**
   * Validate user against LDAP
   * Note: This is now primarily handled by passport-ldapauth strategy directly
   * This is kept for compatibility with other services
   */
  async validateUser(username: string, password: string, configId?: string): Promise<any> {
    try {
      // Get configuration - just to verify it exists and is active
      const config = configId 
        ? await this.getConfigurationById(configId)
        : await this.getDefaultConfiguration();

      if (!config.isActive) {
        this.logger.warn(`Attempted to use inactive LDAP configuration: ${config.name}`);
        return null;
      }
      
      // We're now delegating actual authentication to passport-ldapauth
      // This is just a placeholder that will be used in exceptional cases
      // when direct authentication is needed outside the passport flow
      this.logger.warn('Direct LDAP authentication via validateUser is deprecated - use passport-ldapauth strategy instead');
      
      return null;
    } catch (error) {
      this.logger.error(`Error validating LDAP user: ${error.message}`);
      return null;
    }
  }

  /**
   * Map LDAP user to internal user structure
   */
  mapLdapUser(entry: SearchEntryObject, config: LdapConfiguration): any {
    const attributes = config.attributes || {};
    
    // Extract values using mappings
    const displayName = this.getLdapAttribute(entry, attributes.displayName || 'displayName');
    const email = this.getLdapAttribute(entry, attributes.email || 'mail');
    const userId = this.getLdapAttribute(entry, attributes.userId || 'objectGUID') || entry.dn;
    const username = this.getLdapAttribute(entry, attributes.username || 'sAMAccountName');
    
    return {
      id: userId,
      username,
      displayName: displayName || username,
      email,
      ldapDn: entry.dn,
      roles: ['user'], // Default role, will be enhanced later with LDAP role mapping
    };
  }

  /**
   * Get LDAP attribute value, handling arrays and null values
   */
  private getLdapAttribute(entry: SearchEntryObject, attributeName: string): string | null {
    if (!entry || !attributeName) return null;
    
    const value = entry[attributeName];
    if (!value) return null;
    
    return Array.isArray(value) ? value[0] : value;
  }
} 