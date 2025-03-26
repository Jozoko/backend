import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = process.env.NODE_ENV === 'production';
        const consoleFormat = winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, trace }) => {
            return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
          }),
        );

        const jsonFormat = winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        );

        return {
          level: isProduction ? 'info' : 'debug',
          format: isProduction ? jsonFormat : consoleFormat,
          transports: [
            new winston.transports.Console(),
            // Add file transports for production if needed
            ...(isProduction
              ? [
                  new winston.transports.File({
                    filename: 'logs/error.log',
                    level: 'error',
                  }),
                  new winston.transports.File({
                    filename: 'logs/combined.log',
                  }),
                ]
              : []),
          ],
        };
      },
    }),
  ],
})
export class LoggingModule {} 