import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// Import passport-ldapauth with require syntax
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Strategy = require('passport-ldapauth').Strategy;
import { LdapService } from '../services/ldap.service';
import { LdapConfiguration } from '../entities';
import * as fs from 'fs';

@Injectable()
export class LdapStrategy extends PassportStrategy(Strategy, 'ldap') {
  private readonly logger = new Logger(LdapStrategy.name);
  
  constructor(private ldapService: LdapService) {
    super({
      passReqToCallback: true,
      // This initial server config is just a placeholder and will be overridden
      // in the authenticate method for each request
      server: {
        url: 'ldap://localhost:389',
        bindDN: '',
        bindCredentials: '',
        searchBase: '',
        searchFilter: '',
        tlsOptions: {},
      },
    });
  }

  /**
   * Get LDAP configuration for passport-ldapauth
   * This is called for each authentication attempt
   */
  async getLdapConfiguration(configId?: string): Promise<any> {
    try {
      // Get configuration
      const config = configId
        ? await this.ldapService.getConfigurationById(configId)
        : await this.ldapService.getDefaultConfiguration();

      if (!config.isActive) {
        this.logger.warn(`Attempted to use inactive LDAP configuration: ${config.name}`);
        throw new UnauthorizedException('LDAP configuration is inactive');
      }

      // Create server config in passport-ldapauth format
      const serverConfig: any = {
        url: `ldap://${config.host}:${config.port}`,
        bindDN: config.bindDN,
        bindCredentials: config.bindCredentials,
        searchBase: config.baseDN,
        searchFilter: config.searchFilter,
        searchAttributes: ['*'],
      };

      // Add TLS options if enabled
      if (config.useTLS && config.tlsCertPath) {
        serverConfig.url = `ldaps://${config.host}:${config.port}`;
        serverConfig.tlsOptions = {
          ca: [fs.readFileSync(config.tlsCertPath)],
        };
      }

      // Add username suffix if defined
      if (config.usernameSuffix) {
        serverConfig.usernameSuffix = config.usernameSuffix;
      }

      return { server: serverConfig, config };
    } catch (error) {
      this.logger.error(`Error getting LDAP configuration: ${error.message}`);
      throw new UnauthorizedException('Invalid LDAP configuration');
    }
  }

  /**
   * Override authenticate method to dynamically set LDAP configuration
   */
  authenticate(req: any, options?: any): any {
    const configId = req.body?.ldapConfigurationId;
    
    this.getLdapConfiguration(configId)
      .then(({ server, config }) => {
        // Store the config for use in validate
        req._ldapConfig = config;
        
        // Call passport-ldapauth authenticate with the server config
        // This is how passport-ldapauth documentation recommends using dynamic configs
        // @see https://github.com/vesse/passport-ldapauth#asynchronous-configuration-retrieval
        const newOptions = { ...options, server };
        super.authenticate(req, newOptions);
      })
      .catch(error => {
        this.fail(error.message);
      });
  }

  /**
   * Validate LDAP user
   */
  async validate(req: any, user: any): Promise<any> {
    try {
      if (!user) {
        throw new UnauthorizedException('Invalid LDAP credentials');
      }

      // Get the LDAP config that was used for authentication
      const config = req._ldapConfig;
      
      // Map LDAP attributes to user properties using the configuration
      return this.ldapService.mapLdapUser(user, config);
    } catch (error) {
      this.logger.error(`LDAP validation error: ${error.message}`);
      throw new UnauthorizedException('Invalid LDAP credentials');
    }
  }
} 