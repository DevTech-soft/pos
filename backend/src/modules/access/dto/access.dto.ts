import { IsString, IsOptional, IsInt, Min, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class RegisterEntryDto {
  @IsOptional()
  @IsString()
  visitorName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  adults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  children?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  freeMinors?: number;

  // Si se omiten estos tres campos, la entrada queda como "cuenta abierta"
  // (se cobra después, ver AccessService.settleTab).
  @IsOptional()
  @IsString()
  cashierSessionId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amountPaid?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RegisterExitDto {
  @IsOptional()
  @IsDateString()
  exitTime?: string;
}

export class SettleTabDto {
  @IsString()
  cashierSessionId: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amountPaid: number;
}

export class UpdateAccessPricingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  entryAdultPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  entryChildPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  entryFreeUnderAge?: number;
}
