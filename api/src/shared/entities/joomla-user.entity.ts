import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity({ schema: 'joomla', name: 'jos_users', synchronize: false })
export class JoomlaUser {
  @PrimaryColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  username: string;

  @Column()
  email: string;
}
