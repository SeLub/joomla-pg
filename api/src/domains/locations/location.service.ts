import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LocationRepository } from './location.repository';
import { NearestQuery, NearestResult } from './location.types';

@Injectable()
export class LocationService {
  constructor(
    private readonly repo: LocationRepository,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async findNearest({ lat, lon, limit = 10 }: NearestQuery): Promise<NearestResult[]> {
    const key = `nearest:${lat}:${lon}:${limit}`;
    const cached = await this.cache.get<NearestResult[]>(key);
    if (cached) return cached;

    const rows = await this.repo.findNearest(lon, lat, limit);
    await this.cache.set(key, rows, 60 * 2);
    return rows;
  }
}
