import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollPeriodType } from '@prisma/client';

export class CreatePayrollPeriodDto {
  @IsEnum(PayrollPeriodType) periodType: PayrollPeriodType;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePayrollEntryDto {
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) extras?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) deductions?: number;
  @IsOptional() @IsString() notes?: string;
}

export class MarkPaidDto {
  @IsBoolean() isPaid: boolean;
}
