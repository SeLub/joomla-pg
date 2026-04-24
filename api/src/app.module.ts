import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { LocationsModule } from './locations/locations.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => ({
        stores: [
          new KeyvRedis(`redis://${process.env.REDIS_HOST || 'redis'}:6379`),
        ],
        ttl: 60 * 5, // 5 minutes default
      }),
    }),
    LocationsModule,
    HealthModule,
  ],
})
export class AppModule {}
