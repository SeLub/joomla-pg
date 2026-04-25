import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppUsersService } from './users.service';
import { ProvisionUserDto } from './provision.dto';

@Controller('v1/users')
export class ProvisionController {
  constructor(private readonly usersService: AppUsersService) {}

  @Post('provision')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async provision(@Body() dto: ProvisionUserDto) {
    return this.usersService.provision(dto);
  }
}