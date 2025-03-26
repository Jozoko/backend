import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// Import passport-ldapauth with require syntax for compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PassportLdapStrategy = require('passport-ldapauth').Strategy;
import { LdapService } from '../services/ldap.service';
import { UserService } from '../../users/services/user.service';
import * as fs from 'fs';

@Injectable()
export class LdapStrategy extends PassportStrategy(PassportLdapStrategy, 'ldap') {
  private readonly logger = new Logger(LdapStrategy.name);

  constructor(
    private readonly ldapService: LdapService,
    private readonly userService: UserService,
  ) {
    super({
      server: {
        // This is just placeholder - real config is provided via getServer
        url: 'ldap://placeholder.example.com',
      },
      // Use server function for dynamic configuration
      getServer: async (req: any, callback: any) => {
        try {
          // Get the LDAP configuration ID from the request if available
          const configId = req.body?.ldapConfigurationId;
          
          // Get the LDAP configuration
          const result = await this.getLdapConfiguration(configId);
          
          // Store the config for use in validate method
          req._ldapConfig = result.config;
          
          // Return the server configuration to passport-ldapauth
          return callback(null, result.server);
        } catch (error) {
          this.logger.error(`Error getting LDAP server config: ${error.message}`);
          return callback(error);
        }
      },
    });
  }

  /**
   * Get LDAP configuration for passport-ldapauth
   * This is called for each authentication attempt via the getServer function
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

      // Create server config in passport-ldapauth format with best practices
      const serverConfig: any = {
        url: `ldap://${config.host}:${config.port}`,
        bindDN: config.bindDN,
        bindCredentials: config.bindCredentials,
        searchBase: config.baseDN,
        searchFilter: config.searchFilter,
        searchAttributes: ['*'],
        reconnect: true, // Enable reconnect for better stability
        timeout: 10000, // 10 second timeout
        connectTimeout: 10000, // 10 second connect timeout
      };

      // Add TLS options if enabled
      if (config.useTLS && config.tlsCertPath) {
        serverConfig.url = `ldaps://${config.host}:${config.port}`;
        serverConfig.tlsOptions = {
          ca: [fs.readFileSync(config.tlsCertPath)],
          rejectUnauthorized: true // Enforce certificate validation
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
   * Validate LDAP user
   * This is called by passport-ldapauth after successful authentication
   */
  async validate(req: any, user: any): Promise<any> {
    try {
      if (!user) {
        throw new UnauthorizedException('Invalid LDAP credentials');
      }

      // Get the LDAP config that was used for authentication
      const config = req._ldapConfig;
      
      if (!config) {
        this.logger.error('LDAP configuration missing in request');
        throw new UnauthorizedException('Authentication configuration error');
      }
      
      this.logger.debug(`LDAP authentication successful for user: ${user.dn}`);
      
      // Map LDAP attributes to user properties using the configuration
      const mappedUser = this.ldapService.mapLdapUser(user, config);
      
      // Add useful debugging information
      this.logger.debug(`Mapped LDAP user to: ${JSON.stringify({
        username: mappedUser.username,
        displayName: mappedUser.displayName,
        email: mappedUser.email
      })}`);
      
      // Create or update the user in the database
      try {
        // Pass the mapped user and LDAP configuration ID to userService
        const dbUser = await this.userService.createOrUpdateFromLdap(mappedUser, config.id);
        
        this.logger.debug(`User created/updated in database with ID: ${dbUser.id}`);
        
        // Merge database user properties with mappedUser
        return {
          ...mappedUser,
          id: dbUser.id, // Use the database ID as the primary identifier
        };
      } catch (error) {
        this.logger.error(`Failed to create/update user in database: ${error.message}`);
        throw new UnauthorizedException('User registration failed');
      }
    } catch (error) {
      this.logger.error(`LDAP validation error: ${error.message}`);
      throw new UnauthorizedException('Invalid LDAP credentials');
    }
  }
} 