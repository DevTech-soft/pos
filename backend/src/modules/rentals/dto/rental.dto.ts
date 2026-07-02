import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, ArrayMinSize, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

// ── Espacios (catálogo) ───────────────────────────────────────────────────────

export class CreateSpaceDto {
  @IsString() name: string;
  @IsNumber() @Min(0) @Type(() => Number) price: number;
}

export class UpdateSpaceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) price?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Reservas ──────────────────────────────────────────────────────────────────

export class CreateRentalDto {
  @IsString() customerName: string;
  @IsOptional() @IsString() phone?: string;
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) spaceIds: string[];
  @IsOptional() @IsString() notes?: string;

  // Si se omiten, la reserva queda como "cuenta abierta" (se cobra después).
  @IsOptional() @IsString() cashierSessionId?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) amountPaid?: number;
}

export class SettleRentalDto {
  @IsString() cashierSessionId: string;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsNumber() @Min(0) @Type(() => Number) amountPaid: number;
}
