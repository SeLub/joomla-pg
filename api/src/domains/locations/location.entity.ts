import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ schema: 'public', name: 'locations' })
export class Location {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  address: string;

  @Index({ spatial: true })
  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })
  coords: string;
}
