import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class HelperService {
  private readonly logger = new Logger(HelperService.name);

  /**
   * Generate a unique ID (UUID v4)
   */
  generateUuid(): string {
    return randomUUID();
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safely parse JSON string
   */
  safeJsonParse<T>(jsonString: string, defaultValue: T): T {
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      this.logger.warn(`Failed to parse JSON: ${error.message}`);
      return defaultValue;
    }
  }

  /**
   * Check if value is a valid JSON string
   */
  isValidJson(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a deep copy of an object
   */
  deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Get a nested property safely using a path string
   * Example: getNestedProperty(obj, 'user.address.city')
   */
  getNestedProperty<T>(obj: any, path: string, defaultValue?: T): T {
    try {
      const parts = path.split('.');
      let current = obj;

      for (const part of parts) {
        if (current === null || current === undefined) {
          return defaultValue as T;
        }
        current = current[part];
      }

      return (current === undefined) ? defaultValue as T : current;
    } catch (error) {
      this.logger.warn(`Failed to get nested property ${path}: ${error.message}`);
      return defaultValue as T;
    }
  }

  /**
   * Format a date to ISO string or custom format
   */
  formatDate(date: Date, format?: string): string {
    try {
      if (!date) return '';
      
      if (!format) {
        return date.toISOString();
      }
      
      // Very basic custom format support
      return format
        .replace('YYYY', date.getFullYear().toString())
        .replace('MM', (date.getMonth() + 1).toString().padStart(2, '0'))
        .replace('DD', date.getDate().toString().padStart(2, '0'))
        .replace('HH', date.getHours().toString().padStart(2, '0'))
        .replace('mm', date.getMinutes().toString().padStart(2, '0'))
        .replace('ss', date.getSeconds().toString().padStart(2, '0'));
    } catch (error) {
      this.logger.warn(`Failed to format date: ${error.message}`);
      return '';
    }
  }
} 