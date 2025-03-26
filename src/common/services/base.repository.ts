import { Logger } from '@nestjs/common';
import { FindOptionsWhere, Repository, FindManyOptions, FindOneOptions } from 'typeorm';

export abstract class BaseRepository<T> {
  protected abstract readonly logger: Logger;
  
  constructor(protected readonly repository: Repository<T>) {}

  /**
   * Find many entities with optional filtering
   */
  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    try {
      return await this.repository.find(options);
    } catch (error) {
      this.logger.error(`Error finding entities: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find one entity by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      return await this.repository.findOneBy({ 
        id 
      } as unknown as FindOptionsWhere<T>);
    } catch (error) {
      this.logger.error(`Error finding entity by ID ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find one entity with options
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    try {
      return await this.repository.findOne(options);
    } catch (error) {
      this.logger.error(`Error finding entity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new entity
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const entity = this.repository.create(data as any);
      return await this.repository.save(entity);
    } catch (error) {
      this.logger.error(`Error creating entity: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an entity
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    try {
      await this.repository.update(id, data as any);
      return this.findById(id);
    } catch (error) {
      this.logger.error(`Error updating entity ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.repository.delete(id);
      return result.affected > 0;
    } catch (error) {
      this.logger.error(`Error deleting entity ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count entities with filter
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    try {
      return await this.repository.count(options);
    } catch (error) {
      this.logger.error(`Error counting entities: ${error.message}`);
      throw error;
    }
  }
} 