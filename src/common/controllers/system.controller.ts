import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CacheService } from '../services/cache.service';
import { QueueService } from '../../tasks/services/queue.service';

@ApiTags('system')
@Controller('admin/system')
export class SystemController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly queueService: QueueService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'Returns system health status' })
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  @Get('queues')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Returns queue statistics' })
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  @Post('queues/clear')
  @ApiOperation({ summary: 'Clear all queues' })
  @ApiResponse({ status: 200, description: 'All queues cleared' })
  async clearQueues() {
    await this.queueService.clearAllQueues();
    return { success: true, message: 'All queues cleared' };
  }

  @Post('queues/test')
  @ApiOperation({ summary: 'Add test job to default queue' })
  @ApiResponse({ status: 201, description: 'Test job added to queue' })
  async addTestJob(@Body() body: any) {
    await this.queueService.addToDefaultQueue('generic-task', {
      data: body || { test: true },
      createdAt: new Date(),
    });
    return { success: true, message: 'Test job added to queue' };
  }

  @Get('cache/:key')
  @ApiOperation({ summary: 'Get a value from cache' })
  @ApiResponse({ status: 200, description: 'Returns the cached value' })
  async getCacheValue(@Param('key') key: string) {
    const value = await this.cacheService.get(key);
    return { key, value, exists: value !== undefined };
  }

  @Put('cache/:key')
  @ApiOperation({ summary: 'Set a value in cache' })
  @ApiResponse({ status: 200, description: 'Value set in cache' })
  async setCacheValue(@Param('key') key: string, @Body() body: any) {
    await this.cacheService.set(key, body.value, body.ttl);
    return { success: true, key, value: body.value };
  }

  @Delete('cache/:key')
  @ApiOperation({ summary: 'Delete a value from cache' })
  @ApiResponse({ status: 200, description: 'Value deleted from cache' })
  async deleteCacheValue(@Param('key') key: string) {
    await this.cacheService.delete(key);
    return { success: true, key };
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear all cache' })
  @ApiResponse({ status: 200, description: 'All cache cleared' })
  async clearCache() {
    await this.cacheService.clear();
    return { success: true, message: 'Cache cleared' };
  }

  @Post('tasks/ldap-sync')
  @ApiOperation({ summary: 'Trigger LDAP synchronization' })
  @ApiResponse({ status: 201, description: 'LDAP sync job added to queue' })
  async triggerLdapSync(@Body() body: { configurationId: string }) {
    await this.queueService.addToSyncQueue('ldap-sync', {
      configurationId: body.configurationId,
      createdAt: new Date(),
    });
    return { success: true, message: 'LDAP sync job added to queue' };
  }
} 