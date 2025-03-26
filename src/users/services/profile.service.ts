import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPreferences } from '../entities';
import { AuditService } from '../../common/services/audit.service';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(UserPreferences)
    private readonly userPreferencesRepository: Repository<UserPreferences>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const preferences = await this.userPreferencesRepository.findOneBy({ userId });
      
      if (!preferences) {
        // Create default preferences
        return this.createDefaultPreferences(userId);
      }
      
      return preferences;
    } catch (error) {
      this.logger.error(`Error getting user preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferencesData: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    try {
      let preferences = await this.userPreferencesRepository.findOneBy({ userId });
      
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }
      
      // Get old values for audit
      const oldValues = { ...preferences };
      
      // Update preferences
      Object.assign(preferences, preferencesData);
      
      // Save preferences
      const updatedPreferences = await this.userPreferencesRepository.save(preferences);
      
      // Log update
      await this.auditService.logUpdate({
        entityType: 'userPreferences',
        entityId: updatedPreferences.id,
        userId,
        oldValues,
        newValues: updatedPreferences,
      });
      
      return updatedPreferences;
    } catch (error) {
      this.logger.error(`Error updating user preferences: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create default preferences
   */
  private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Create with entity properties defined in the entity
      const preferences = this.userPreferencesRepository.create({
        userId,
        theme: 'light',
        language: 'en',
        dashboardLayout: {},
        notifications: {},
        modulePreferences: {},
      });
      
      // Save to database
      const savedPreferences = await this.userPreferencesRepository.save(preferences);
      
      // Log creation
      await this.auditService.logCreation({
        entityType: 'userPreferences',
        entityId: savedPreferences.id,
        userId,
        entityData: savedPreferences,
      });
      
      return savedPreferences;
    } catch (error) {
      this.logger.error(`Error creating default preferences: ${error.message}`);
      throw error;
    }
  }
} 