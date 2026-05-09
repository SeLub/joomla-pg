import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AppUser } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser: AppUser = {
    joomlaId: 1,
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSyncedAt: null,
    settings: {},
  };

  const mockUsersService = {
    findAll: jest.fn().mockResolvedValue([mockUser]),
    findOne: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn().mockResolvedValue(mockUser),
    update: jest.fn().mockResolvedValue({ ...mockUser, email: 'updated@example.com' }),
    remove: jest.fn().mockResolvedValue(undefined),
    findByEmail: jest.fn().mockResolvedValue([mockUser]),
    getCount: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const result = await controller.findAll();
      expect(result).toEqual([mockUser]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single user', async () => {
      const result = await controller.findOne(1);
      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        joomlaId: 1,
        email: 'test@example.com',
        username: 'testuser',
      };

      const result = await controller.create(createUserDto);
      expect(result).toEqual(mockUser);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'updated@example.com',
      };

      const result = await controller.update(1, updateUserDto);
      expect(result.email).toBe('updated@example.com');
      expect(service.update).toHaveBeenCalledWith(1, updateUserDto);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      await controller.remove(1);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('findByEmail', () => {
    it('should find users by email', async () => {
      const result = await controller.findByEmail('test@example.com');
      expect(result).toEqual([mockUser]);
      expect(service.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('getCount', () => {
    it('should return user count', async () => {
      const result = await controller.getCount();
      expect(result).toEqual({ count: 1 });
      expect(service.getCount).toHaveBeenCalled();
    });
  });
});