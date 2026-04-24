import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { DatabaseService } from '../database.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, DatabaseService],
})
export class LocationsModule {}
