import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested, Min, IsInt, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

// ── Products & Variants ──────────────────────────────────────────────────────

export class CreateVariantDto {
  @IsString() name: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() purchaseUnit?: string;
  @IsOptional() @IsString() saleUnit?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) unitsPerPurchase?: number;
  @IsNumber() @Min(0) @Type(() => Number) price: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) cost?: number;
  @IsOptional() @IsInt() @Min(0) @Type(() => Number) stock?: number;
}

export class UpdateVariantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() purchaseUnit?: string;
  @IsOptional() @IsString() saleUnit?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) unitsPerPurchase?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) price?: number;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) cost?: number;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class AdjustStockDto {
  @IsInt() @Type(() => Number) quantity: number; // delta: positivo entra, negativo sale (merma/ajuste)
  @IsString() reason: string;
}

export class CreateProductDto {
  @IsString() name: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() description?: string;
  @IsString() category: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateVariantDto) variants?: CreateVariantDto[];
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

export class CreateSupplierDto {
  @IsString() name: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSupplierDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export class PurchaseOrderItemDto {
  @IsString() productVariantId: string;
  @IsInt() @Min(1) @Type(() => Number) quantity: number;
  @IsNumber() @Min(0) @Type(() => Number) unitCost: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreatePurchaseOrderDto {
  @IsString() supplierId: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PurchaseOrderItemDto) items: PurchaseOrderItemDto[];
}
