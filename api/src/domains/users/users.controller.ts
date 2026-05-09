import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus,
  ParseIntPipe 
} from '@nestjs/common';
import { IsEmail, IsInt, IsString, IsOptional, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UsersService } from './users.service';
import { AppUser } from './user.entity';

// DTO для создания пользователя
export class CreateUserDto {
  @IsInt()
  @Min(1)
  joomlaId: number;

  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

// DTO для обновления пользователя
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Получить всех пользователей
  @Get()
  async findAll(): Promise<AppUser[]> {
    return this.usersService.findAll();
  }

  // Получить пользователя по ID
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AppUser | null> {
    return this.usersService.findOne(id);
  }

  // Создать нового пользователя
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<AppUser> {
    return this.usersService.create(createUserDto);
  }

  // Обновить пользователя
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<AppUser> {
    return this.usersService.update(id, updateUserDto);
  }

  // Удалить пользователя
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usersService.remove(id);
  }

  // Поиск пользователей по email
  @Get('search/by-email')
  async findByEmail(@Query('email') email: string): Promise<AppUser[]> {
    return this.usersService.findByEmail(email);
  }

  // Получить статистику пользователей
  @Get('stats/count')
  async getCount(): Promise<{ count: number }> {
    const count = await this.usersService.getCount();
    return { count };
  }
}