import { IsString, IsOptional, IsNumber, IsEmail, IsBoolean, IsDateString, Min, MinLength, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

// Rol restringido asignable por un ADMIN al dar acceso a un empleado — nunca ADMIN/SUPERADMIN.
export type EmployeeAccessRole = 'CAJERO' | 'EMPLEADO';
const ACCESS_ROLES: EmployeeAccessRole[] = ['CAJERO', 'EMPLEADO'];

export class CreateEmployeeDto {
  @IsString() name: string;
  @IsString() role: string;
  @IsNumber() @Min(0) @Type(() => Number) baseSalary: number;
  @IsDateString() hiredAt: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() notes?: string;

  // Acceso al sistema (checkbox "Dar acceso al sistema" en Empleados)
  @IsOptional() @IsBoolean() grantAccess?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsIn(ACCESS_ROLES) accessRole?: EmployeeAccessRole;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) baseSalary?: number;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // Gestión del acceso al sistema del empleado
  @IsOptional() @IsBoolean() grantAccess?: boolean;
  @IsOptional() @IsString() @MinLength(6) password?: string;
  @IsOptional() @IsIn(ACCESS_ROLES) accessRole?: EmployeeAccessRole;
  @IsOptional() @IsBoolean() revokeAccess?: boolean;
}
