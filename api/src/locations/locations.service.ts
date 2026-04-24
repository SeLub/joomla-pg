import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DatabaseService } from '../database.service';

@Injectable()
export class LocationsService {
  constructor(
    private readonly db: DatabaseService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async findNearest(lat: number, lon: number, limit = 10) {
    const cacheKey = `nearest:${lat}:${lon}:${limit}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const rows = await this.db.query(
      `SELECT id, name, address,
              ROUND(ST_Distance(
                coords::geography,
                ST_MakePoint($1, $2)::geography
              )::numeric, 2) AS distance_m
       FROM locations
       ORDER BY coords <-> ST_MakePoint($1, $2)::geography
       LIMIT $3`,
      [lon, lat, limit],
    );

    await this.cache.set(cacheKey, rows, 60 * 2); // 2 min TTL
    return rows;
  }

  async getRoute(fromId: number, toId: number) {
    const cacheKey = `route:${fromId}:${toId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const rows = await this.db.query(
      `SELECT r.id, r.distance_km, r.duration_min, r.price,
              f.name AS from_city, t.name AS to_city
       FROM routes r
       JOIN locations f ON f.id = r.from_id
       JOIN locations t ON t.id = r.to_id
       WHERE r.from_id = $1 AND r.to_id = $2`,
      [fromId, toId],
    );

    await this.cache.set(cacheKey, rows[0] ?? null, 60 * 60); // 1 hour TTL for routes
    return rows[0] ?? null;
  }
}
