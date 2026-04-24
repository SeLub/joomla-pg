import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './location.entity';
import { NearestResult } from './location.types';

@Injectable()
export class LocationRepository {
  constructor(
    @InjectRepository(Location)
    private readonly repo: Repository<Location>,
  ) {}

  findNearest(lon: number, lat: number, limit: number): Promise<NearestResult[]> {
    return this.repo
      .createQueryBuilder('l')
      .select(['l.id AS id', 'l.name AS name', 'l.address AS address'])
      .addSelect(
        `ROUND(ST_Distance(l.coords::geography, ST_MakePoint(:lon, :lat)::geography)::numeric, 2)`,
        'distance_m',
      )
      .orderBy(`l.coords <-> ST_MakePoint(:lon, :lat)::geography`)
      .setParameters({ lon, lat })
      .limit(limit)
      .getRawMany();
  }
}
