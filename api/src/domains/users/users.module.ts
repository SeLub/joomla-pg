import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppUser } from './user.entity';
import { AppUsersService } from './users.service';
import { ProvisionController } from './provision.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AppUser])],
  controllers: [ProvisionController],
  providers: [AppUsersService],
  exports: [AppUsersService],
})
export class AppUsersModule {}