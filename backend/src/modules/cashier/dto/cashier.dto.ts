import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenCashierDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseCashierDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  closingAmount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
