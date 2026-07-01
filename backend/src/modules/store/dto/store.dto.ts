import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray, ValidateNested, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) @Type(() => Number) price: number;
  @IsString() category: string;
  @IsOptional() @IsString() imageUrl?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) price?: number;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class OrderItemDto {
  @IsString() productId: string;
  @IsInt() @Min(1) @Type(() => Number) quantity: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateOrderDto {
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items: OrderItemDto[];
}

export class PayOrderDto {
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsNumber() @Min(0) @Type(() => Number) amountPaid: number;
  @IsString() cashierSessionId: string;
  @IsOptional() @IsString() notes?: string;
}
