import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Post, 
  Put, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from './config.service';
import { CreateConfigurationDto, UpdateConfigurationDto, CreateCategoryDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationCategory, ConfigurationKey } from './entities';
import { ConfigurationValue } from './entities/configuration-value.entity';

@ApiTags('configuration')
@Controller('admin/configuration')
// TODO: Add appropriate auth guards when authentication is implemented
export class ConfigurationController {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ConfigurationCategory)
    private readonly categoryRepository: Repository<ConfigurationCategory>,
    @InjectRepository(ConfigurationKey)
    private readonly keyRepository: Repository<ConfigurationKey>,
    @InjectRepository(ConfigurationValue)
    private readonly valueRepository: Repository<ConfigurationValue>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all configurations' })
  @ApiResponse({ status: 200, description: 'Return all configurations' })
  async getAllConfigurations() {
    return this.configService.getAllConfigurations();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all configuration categories' })
  @ApiResponse({ status: 200, description: 'Return all configuration categories' })
  async getAllCategories() {
    return this.categoryRepository.find({
      order: {
        displayOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  @Get('category/:name')
  @ApiOperation({ summary: 'Get configurations by category' })
  @ApiResponse({ status: 200, description: 'Return configurations by category' })
  async getConfigurationsByCategory(@Param('name') name: string) {
    return this.configService.getConfigurationsByCategory(name);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new configuration' })
  @ApiResponse({ status: 201, description: 'The configuration has been created' })
  async createConfiguration(@Body() createConfigDto: CreateConfigurationDto) {
    // Find or create category if provided
    if (createConfigDto.categoryName) {
      const category = await this.categoryRepository.findOne({
        where: { name: createConfigDto.categoryName },
      });

      if (!category) {
        const newCategory = this.categoryRepository.create({
          name: createConfigDto.categoryName,
          description: `Category for ${createConfigDto.key}`,
        });
        await this.categoryRepository.save(newCategory);
      }
    }

    // Create or update the configuration key and value
    return this.configService.set(
      createConfigDto.key,
      createConfigDto.value,
      createConfigDto.environment,
    );
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a configuration' })
  @ApiResponse({ status: 200, description: 'The configuration has been updated' })
  async updateConfiguration(
    @Param('key') key: string,
    @Body() updateConfigDto: UpdateConfigurationDto,
  ) {
    // Update category if provided
    if (updateConfigDto.categoryName) {
      let category = await this.categoryRepository.findOne({
        where: { name: updateConfigDto.categoryName },
      });

      if (!category) {
        category = this.categoryRepository.create({
          name: updateConfigDto.categoryName,
          description: `Category for ${key}`,
        });
        await this.categoryRepository.save(category);
      }

      // Find the key and update its category
      const configKey = await this.keyRepository.findOne({
        where: { key },
      });

      if (configKey) {
        configKey.categoryId = category.id;
        if (updateConfigDto.description) {
          configKey.description = updateConfigDto.description;
        }
        if (updateConfigDto.dataType) {
          configKey.dataType = updateConfigDto.dataType;
        }
        await this.keyRepository.save(configKey);
      }
    }

    // Update the value if provided
    if (updateConfigDto.value !== undefined) {
      return this.configService.set(
        key,
        updateConfigDto.value,
        updateConfigDto.environment,
      );
    }

    return { updated: true };
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a configuration' })
  @ApiResponse({ status: 200, description: 'The configuration has been deleted' })
  async deleteConfiguration(
    @Param('key') key: string,
    @Query('environment') environment?: string,
  ) {
    const deleted = await this.configService.delete(key, environment);
    return { deleted };
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new configuration category' })
  @ApiResponse({ status: 201, description: 'The category has been created' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    // Check if category already exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      return existingCategory;
    }

    // Create new category
    const category = this.categoryRepository.create({
      name: createCategoryDto.name,
      description: createCategoryDto.description,
      displayOrder: createCategoryDto.displayOrder || 0,
    });

    return this.categoryRepository.save(category);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a configuration category' })
  @ApiResponse({ status: 200, description: 'The category has been deleted' })
  async deleteCategory(@Param('id') id: string) {
    // Check if there are any keys using this category
    const keys = await this.keyRepository.findOne({
      where: { categoryId: id },
    });

    if (keys) {
      return {
        deleted: false,
        message: 'Cannot delete category that has configuration keys assigned',
      };
    }

    await this.categoryRepository.delete(id);
    return { deleted: true };
  }
} 