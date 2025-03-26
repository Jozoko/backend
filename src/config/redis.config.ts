import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
  url: process.env.REDIS_URL,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
})); 