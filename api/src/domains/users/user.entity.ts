import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'app_users', schema: 'public' })
export class AppUser {
  @PrimaryColumn({ name: 'joomla_id' })
  joomlaId: number;

  @Column()
  email: string;

  @Column()
  username: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;
}