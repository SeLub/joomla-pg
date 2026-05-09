// api/src/domains/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppUser } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppUser]),  // 👈 Регистрируем репозиторий для этого модуля
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],  // 👈 Если сервис используется в других модулях
})
export class AppUsersModule {}