import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JoomlaUser } from '../entities/joomla-user.entity';
import { Location } from '../../domains/locations/location.entity';
// import { Route } from '../../domains/routes/route.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        schema: 'public',
        entities: [Location, JoomlaUser],
        // entities: [Location, Route, JoomlaUser],
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
