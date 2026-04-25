import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProvisionUserDto } from './provision.dto';

@Injectable()
export class AppUsersService {
  private readonly logger = new Logger(AppUsersService.name);

  constructor(private readonly dataSource: DataSource) {}

  async provision(dto: ProvisionUserDto): Promise<{ joomlaId: number; synced: boolean }> {
    // ✅ Идемпотентный UPSERT через raw-запрос (надёжнее, чем TypeORM upsert)
    const result = await this.dataSource.query(
      `INSERT INTO public.app_users (joomla_id, email, username, last_synced_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (joomla_id) DO UPDATE SET
         email = EXCLUDED.email,
         username = EXCLUDED.username,
         last_synced_at = NOW(),
         updated_at = NOW()
       RETURNING joomla_id, last_synced_at`,
      [dto.joomlaUserId, dto.email, dto.username]
    );

    this.logger.log(`Provisioned user joomlaId=${dto.joomlaUserId}`);
    return { joomlaId: result[0].joomla_id, synced: true };
  }
}