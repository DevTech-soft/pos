import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class OrderItemDto {
  @IsString() productVariantId: string;
  @IsInt() @Min(1) @Type(() => Number) quantity: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOrderDto {
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() accessEntryId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[];
}

export class PayOrderDto {
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsNumber() @Min(0) @Type(() => Number) amountPaid: number;
  @IsString() cashierSessionId: string;
  @IsOptional() @IsString() notes?: string;
}
