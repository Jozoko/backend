import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from './config.service';
import { ConfigurationController } from './configuration.controller';
import { ConfigSeeder } from './config.seeder';
import { 
  ConfigurationCategory,
  ConfigurationKey,
  ConfigurationValue
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfigurationCategory,
      ConfigurationKey,
      ConfigurationValue,
    ]),
  ],
  controllers: [ConfigurationController],
  providers: [ConfigService, ConfigSeeder],
  exports: [ConfigService],
})
export class DatabaseConfigModule {} 