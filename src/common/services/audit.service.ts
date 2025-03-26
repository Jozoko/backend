import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Create an audit log entry
   */
  async createLog(data: {
    action: string;
    entityType: string;
    entityId?: string;
    userId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    additionalData?: Record<string, any>;
  }): Promise<AuditLog> {
    try {
      const auditLog = this.auditLogRepository.create({
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        oldValues: data.oldValues,
        newValues: data.newValues,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        additionalData: data.additionalData,
        timestamp: new Date(),
      });

      return await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      // Don't throw error to prevent affecting the main operation
      return null;
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entityType: string, entityId: string): Promise<AuditLog[]> {
    try {
      return await this.auditLogRepository.find({
        where: { entityType, entityId },
        order: { timestamp: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get entity logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId: string): Promise<AuditLog[]> {
    try {
      return await this.auditLogRepository.find({
        where: { userId },
        order: { timestamp: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to get user logs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Log entity creation
   */
  async logCreation(data: {
    entityType: string;
    entityId: string;
    userId?: string;
    entityData: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return this.createLog({
      action: 'create',
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      oldValues: null,
      newValues: data.entityData,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  /**
   * Log entity update
   */
  async logUpdate(data: {
    entityType: string;
    entityId: string;
    userId?: string;
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return this.createLog({
      action: 'update',
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      oldValues: data.oldValues,
      newValues: data.newValues,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  /**
   * Log entity deletion
   */
  async logDeletion(data: {
    entityType: string;
    entityId: string;
    userId?: string;
    entityData: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return this.createLog({
      action: 'delete',
      entityType: data.entityType,
      entityId: data.entityId,
      userId: data.userId,
      oldValues: data.entityData,
      newValues: null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }
} 