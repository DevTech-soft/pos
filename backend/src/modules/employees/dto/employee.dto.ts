import { IsString, IsOptional, IsNumber, IsEmail, IsBoolean, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEmployeeDto {
  @IsString() name: string;
  @IsString() role: string;
  @IsNumber() @Min(0) @Type(() => Number) baseSalary: number;
  @IsDateString() hiredAt: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) baseSalary?: number;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
