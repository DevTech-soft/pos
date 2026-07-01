import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateOrderDto, PayOrderDto } from './dto/store.dto';

const CACHE_TTL = 300;

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  // ── Products (catálogo para el POS) ──────────────────────────────────────

  async getProducts(tenantId: string) {
    const cacheKey = `store:products:${tenantId}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true, variants: { some: { isActive: true, isAvailable: true } } },
      include: { variants: { where: { isActive: true, isAvailable: true }, orderBy: { name: 'asc' } } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    await this.redis.setJson(cacheKey, products, CACHE_TTL);
    return products;
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async createOrder(tenantId: string, dto: CreateOrderDto) {
    const variantIds = dto.items.map(i => i.productVariantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, tenantId, isActive: true, isAvailable: true },
      include: { product: true },
    });
    if (variants.length !== new Set(variantIds).size) {
      throw new BadRequestException('Producto no encontrado en esta tienda');
    }

    for (const item of dto.items) {
      const variant = variants.find(v => v.id === item.productVariantId)!;
      if (variant.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${variant.product.name} (${variant.name}): disponible ${variant.stock}`,
        );
      }
    }

    const items = dto.items.map(item => {
      const variant = variants.find(v => v.id === item.productVariantId)!;
      const subtotal = Number(variant.price) * item.quantity;
      return { productVariantId: item.productVariantId, quantity: item.quantity, unitPrice: variant.price, subtotal, notes: item.notes };
    });

    const totalAmount = items.reduce((acc, i) => acc + Number(i.subtotal), 0);

    const order = await this.prisma.$transaction(async (tx) => {
      // updateMany con condición de stock evita sobrevender ante ventas concurrentes:
      // si otra venta ya consumió el stock entre la validación y este punto, count será 0.
      for (const item of dto.items) {
        const { count } = await tx.productVariant.updateMany({
          where: { id: item.productVariantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (count === 0) {
          const variant = variants.find(v => v.id === item.productVariantId)!;
          throw new BadRequestException(`Stock insuficiente para ${variant.product.name} (${variant.name})`);
        }
      }
      return tx.order.create({
        data: {
          tenantId,
          customerName: dto.customerName,
          notes: dto.notes,
          totalAmount,
          items: { create: items },
        },
        include: { items: { include: { productVariant: { include: { product: true } } } } },
      });
    });

    await this.redis.del(`store:products:${tenantId}`);
    return order;
  }

  async cancelOrder(tenantId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId, status: 'PENDIENTE' },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado o ya procesado');

    await this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELADO', closedAt: new Date() } });
    });

    await this.redis.del(`store:products:${tenantId}`);
    return { success: true };
  }

  async payOrder(tenantId: string, orderId: string, dto: PayOrderDto) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId, status: 'PENDIENTE' } });
    if (!order) throw new NotFoundException('Pedido no encontrado o ya pagado');

    const session = await this.prisma.cashierSession.findFirst({ where: { id: dto.cashierSessionId, tenantId, status: 'ABIERTA' } });
    if (!session) throw new BadRequestException('Caja no encontrada o cerrada');

    const change = Number(dto.amountPaid) - Number(order.totalAmount);
    if (change < 0) throw new BadRequestException('Monto insuficiente');

    const [, sale] = await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: 'PAGADO', closedAt: new Date() } }),
      this.prisma.sale.create({
        data: {
          tenantId,
          orderId,
          cashierSessionId: dto.cashierSessionId,
          totalAmount: order.totalAmount,
          paymentMethod: dto.paymentMethod,
          amountPaid: dto.amountPaid,
          change,
          notes: dto.notes,
        },
      }),
      this.prisma.cashierSession.update({
        where: { id: dto.cashierSessionId },
        data: { totalSales: { increment: Number(order.totalAmount) }, totalIngresos: { increment: Number(dto.amountPaid) } },
      }),
    ]);
    return sale;
  }

  getActiveOrders(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId, status: 'PENDIENTE' },
      include: { items: { include: { productVariant: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getSales(tenantId: string, sessionId?: string) {
    return this.prisma.sale.findMany({
      where: { tenantId, ...(sessionId ? { cashierSessionId: sessionId } : {}) },
      include: { order: { include: { items: { include: { productVariant: { include: { product: true } } } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
