import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { LocationsModule } from './/locations/locations.module';
import { HealthModule } from './health/health.module';
import { AppUsersModule } from './domains/users/users.module';
import { DatabaseModule } from './shared/database/database.module';


@Module({
  imports: [
    DatabaseModule,
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
    AppUsersModule,
  ],
})
export class AppModule {}
