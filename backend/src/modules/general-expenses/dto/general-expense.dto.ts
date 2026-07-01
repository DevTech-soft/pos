import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { GeneralExpenseCategory } from '@prisma/client';

export class CreateGeneralExpenseDto {
  @IsEnum(GeneralExpenseCategory) category: GeneralExpenseCategory;
  @IsString() description: string;
  @IsOptional() @IsString() type?: string;
  @IsNumber() @Min(0) @Type(() => Number) amount: number;
  @IsDateString() date: string;
  @IsOptional() @IsString() receiptRef?: string;
  @IsOptional() @IsString() notes?: string;
}
