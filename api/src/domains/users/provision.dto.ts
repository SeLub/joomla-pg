import { IsInt, IsEmail, IsString, MinLength } from 'class-validator';

export class ProvisionUserDto {
  @IsInt()
  joomlaUserId: number;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  username: string;
}