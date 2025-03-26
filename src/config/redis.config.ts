import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => {
  const redisUrl = process.env.REDIS_URL;
  
  // Base configuration
  const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  };

  // If URL is provided, it takes precedence
  if (redisUrl) {
    return {
      url: redisUrl,
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10),
    };
  }

  return config;
}); 