// api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';  // 👈 Добавляем
import KeyvRedis from '@keyv/redis';

// Модули
import { LocationsModule } from './locations/locations.module';
import { HealthModule } from './health/health.module';
import { AppUsersModule } from './domains/users/users.module';

// Сущности
import { Location } from './domains/locations/location.entity';
import { AppUser } from './domains/users/user.entity';

@Module({
  imports: [
    // 🔹 Config (глобальный, загружает .env файлы)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationOptions: {
        allowUnknown: true,  // ✅ Разрешаем неизвестные переменные (гибкость)
      },
    }),

    // 🔹 TypeORM (подключение к БД) — напрямую в AppModule
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],  // 👈 Внедряем ConfigService для доступа к env
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        schema: 'public',
        entities: [Location, AppUser],  // ✅ Только наши сущности
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,  // ✅ Авто-применение миграций при старте
        logging: config.get('NODE_ENV') === 'development',
        autoLoadEntities: true,  // ✅ Не нужно явно перечислять все сущности в модулях
        synchronize: false,  // ❌ Никогда не включайте в продакшене! Используйте миграции.
        ssl: config.get('NODE_ENV') === 'production' 
          ? { rejectUnauthorized: false }  // ✅ Для облачных БД (Railway, Render, etc.)
          : false,
      }),
    }),

    // 🔹 Cache (Redis)
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        stores: [
          new KeyvRedis(`redis://${config.get('REDIS_HOST', 'localhost')}:6379`),
        ],
        ttl: config.get<number>('CACHE_TTL', 60 * 5), // 5 минут по умолчанию
      }),
    }),

    // 🔹 Фича-модули
    LocationsModule,
    HealthModule,
    AppUsersModule,
  ],
})
export class AppModule {}