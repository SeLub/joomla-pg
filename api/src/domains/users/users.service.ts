import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AppUser } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto, UpdateUserDto } from './users.controller';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AppUser)
    private readonly userRepository: Repository<AppUser>,
  ) {}

  // Найти всех пользователей
  async findAll(): Promise<AppUser[]> {
    return this.userRepository.find();
  }

  // Найти пользователя по ID
  async findOne(joomlaId: number): Promise<AppUser | null> {
    return this.userRepository.findOne({ where: { joomlaId } });
  }

  // Создать пользователя
  async create(createUserDto: CreateUserDto): Promise<AppUser> {
    const user = this.userRepository.create({
      joomlaId: createUserDto.joomlaId,
      email: createUserDto.email,
      username: createUserDto.username,
      settings: createUserDto.settings || {},
    });
    
    return this.userRepository.save(user);
  }

  // Обновить пользователя
  async update(joomlaId: number, updateUserDto: UpdateUserDto): Promise<AppUser> {
    const user = await this.findOne(joomlaId);
    if (!user) {
      throw new NotFoundException(`User with ID ${joomlaId} not found`);
    }

    // Обновляем только переданные поля
    if (updateUserDto.email !== undefined) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.username !== undefined) {
      user.username = updateUserDto.username;
    }
    if (updateUserDto.settings !== undefined) {
      user.settings = updateUserDto.settings;
    }

    user.lastSyncedAt = new Date();
    return this.userRepository.save(user);
  }

  // Удалить пользователя
  async remove(joomlaId: number): Promise<void> {
    const result = await this.userRepository.delete(joomlaId);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${joomlaId} not found`);
    }
  }

  // Найти пользователей по email
  async findByEmail(email: string): Promise<AppUser[]> {
    return this.userRepository.find({ where: { email } });
  }

  // Получить количество пользователей
  async getCount(): Promise<number> {
    return this.userRepository.count();
  }

  // Проверить существование пользователя
  async exists(joomlaId: number): Promise<boolean> {
    const count = await this.userRepository.count({ where: { joomlaId } });
    return count > 0;
  }
}