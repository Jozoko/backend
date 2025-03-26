import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables from the appropriate .env file
const nodeEnv = process.env.NODE_ENV || 'development';
config({ path: join(__dirname, '..', `.env.${nodeEnv}`) });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'innosecportal',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false, // Always false for migrations
  logging: process.env.DB_LOGGING === 'true',
  ssl: process.env.DB_SSL === 'true'
    ? {
      rejectUnauthorized: false,
    }
    : false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource; 