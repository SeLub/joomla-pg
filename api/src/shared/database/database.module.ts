import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JoomlaUser } from '../entities/joomla-user.entity';
import { Location } from '../../domains/locations/location.entity';
import { AppUser } from '../../domains/users/user.entity';
// import { Route } from '../../domains/routes/route.entity';

@Global() 
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        schema: 'public',
        entities: [Location, JoomlaUser, AppUser],
        // entities: [Location, Route, JoomlaUser],
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,
        logging: process.env.NODE_ENV === 'development',
        autoLoadEntities: true,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
