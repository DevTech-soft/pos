import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import {
  CreateProductDto, UpdateProductDto, CreateVariantDto, UpdateVariantDto, AdjustStockDto,
  CreateSupplierDto, UpdateSupplierDto, CreatePurchaseOrderDto,
} from './dto/inventory.dto';

const CACHE_TTL = 300;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  private async invalidateProducts(tenantId: string) {
    await Promise.all([
      this.redis.del(`inventory:products:${tenantId}`),
      this.redis.del(`store:products:${tenantId}`),
    ]);
  }

  // ── Products & Variants ────────────────────────────────────────────────────

  async getProducts(tenantId: string) {
    const cacheKey = `inventory:products:${tenantId}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { variants: { orderBy: { name: 'asc' } } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    await this.redis.setJson(cacheKey, products, CACHE_TTL);
    return products;
  }

  async getProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: { variants: { orderBy: { name: 'asc' } } },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async createProduct(tenantId: string, dto: CreateProductDto) {
    const { variants, ...data } = dto;
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        ...data,
        variants: variants?.length ? { create: variants.map(v => ({ ...v, tenantId })) } : undefined,
      },
      include: { variants: true },
    });
    await this.invalidateProducts(tenantId);
    return product;
  }

  async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const updated = await this.prisma.product.update({ where: { id }, data: dto, include: { variants: true } });
    await this.invalidateProducts(tenantId);
    return updated;
  }

  async addVariant(tenantId: string, productId: string, dto: CreateVariantDto) {
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const variant = await this.prisma.productVariant.create({ data: { tenantId, productId, ...dto } });
    await this.invalidateProducts(tenantId);
    return variant;
  }

  async updateVariant(tenantId: string, id: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findFirst({ where: { id, tenantId } });
    if (!variant) throw new NotFoundException('Presentación no encontrada');
    const updated = await this.prisma.productVariant.update({ where: { id }, data: dto });
    await this.invalidateProducts(tenantId);
    return updated;
  }

  async adjustStock(tenantId: string, id: string, dto: AdjustStockDto) {
    if (dto.quantity === 0) throw new BadRequestException('La cantidad del ajuste no puede ser cero');
    const variant = await this.prisma.productVariant.findFirst({ where: { id, tenantId } });
    if (!variant) throw new NotFoundException('Presentación no encontrada');
    if (variant.stock + dto.quantity < 0) throw new BadRequestException('El ajuste dejaría el stock en negativo');
    const updated = await this.prisma.productVariant.update({
      where: { id },
      data: { stock: { increment: dto.quantity } },
    });
    await this.invalidateProducts(tenantId);
    return updated;
  }

  // ── Suppliers ───────────────────────────────────────────────────────────────

  async getSuppliers(tenantId: string) {
    return this.prisma.supplier.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } });
  }

  async createSupplier(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: { tenantId, ...dto } });
  }

  async updateSupplier(tenantId: string, id: string, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  // ── Purchase Orders ─────────────────────────────────────────────────────────

  getPurchaseOrders(tenantId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      include: { supplier: true, items: { include: { productVariant: { include: { product: true } } } } },
      orderBy: { orderDate: 'desc' },
    });
  }

  async getPurchaseOrder(tenantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { supplier: true, items: { include: { productVariant: { include: { product: true } } } } },
    });
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    return order;
  }

  async createPurchaseOrder(tenantId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id: dto.supplierId, tenantId } });
    if (!supplier) throw new BadRequestException('Proveedor no encontrado en esta tienda');

    const variantIds = dto.items.map(i => i.productVariantId);
    const variants = await this.prisma.productVariant.findMany({ where: { id: { in: variantIds }, tenantId } });
    if (variants.length !== new Set(variantIds).size) throw new BadRequestException('Presentación no encontrada en esta tienda');

    const items = dto.items.map(item => ({
      productVariantId: item.productVariantId,
      quantity: item.quantity,
      unitCost: item.unitCost,
      subtotal: item.quantity * item.unitCost,
      notes: item.notes,
    }));
    const totalAmount = items.reduce((acc, i) => acc + i.subtotal, 0);

    const order = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: dto.supplierId,
        createdBy: userId,
        notes: dto.notes,
        totalAmount,
        items: { create: items },
      },
      include: { supplier: true, items: { include: { productVariant: { include: { product: true } } } } },
    });
    return order;
  }

  async receivePurchaseOrder(tenantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId, status: 'PENDIENTE' },
      include: { items: { include: { productVariant: true } } },
    });
    if (!order) throw new NotFoundException('Orden de compra no encontrada o ya procesada');

    // La cantidad de cada ítem está en unidades de compra (ej. cajas); se convierte a
    // unidades de venta con `unitsPerPurchase` y el costo se prorratea por unidad de venta.
    await this.prisma.$transaction([
      ...order.items.map(item => {
        const unitsPerPurchase = item.productVariant.unitsPerPurchase || 1;
        const stockToAdd = item.quantity * unitsPerPurchase;
        const costPerSaleUnit = Number(item.unitCost) / unitsPerPurchase;
        return this.prisma.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { increment: stockToAdd }, cost: costPerSaleUnit },
        });
      }),
      this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'RECIBIDA', receivedAt: new Date() } }),
    ]);

    await this.invalidateProducts(tenantId);
    return this.getPurchaseOrder(tenantId, id);
  }

  async cancelPurchaseOrder(tenantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, tenantId, status: 'PENDIENTE' } });
    if (!order) throw new NotFoundException('Orden de compra no encontrada o ya procesada');
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'CANCELADA' } });
  }
}
