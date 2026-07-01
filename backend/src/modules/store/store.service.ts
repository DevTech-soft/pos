import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { CreateProductDto, UpdateProductDto, CreateOrderDto, PayOrderDto } from './dto/store.dto';

const CACHE_TTL = 300;

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  // ── Products ─────────────────────────────────────────────────────────────

  async getProducts(tenantId: string) {
    const cacheKey = `store:products:${tenantId}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    await this.redis.setJson(cacheKey, products, CACHE_TTL);
    return products;
  }

  async createProduct(tenantId: string, dto: CreateProductDto) {
    const product = await this.prisma.product.create({ data: { tenantId, ...dto } });
    await this.redis.del(`store:products:${tenantId}`);
    return product;
  }

  async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    const updated = await this.prisma.product.update({ where: { id }, data: dto });
    await this.redis.del(`store:products:${tenantId}`);
    return updated;
  }

  // ── Orders ────────────────────────────────────────────────────────────────

  async createOrder(tenantId: string, dto: CreateOrderDto) {
    const productIds = dto.items.map(i => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });

    if (products.length !== productIds.length) throw new BadRequestException('Producto no encontrado en esta tienda');

    const items = dto.items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      const subtotal = Number(product.price) * item.quantity;
      return { productId: item.productId, quantity: item.quantity, unitPrice: product.price, subtotal, notes: item.notes };
    });

    const totalAmount = items.reduce((acc, i) => acc + Number(i.subtotal), 0);

    return this.prisma.order.create({
      data: {
        tenantId,
        customerName: dto.customerName,
        notes: dto.notes,
        totalAmount,
        items: { create: items },
      },
      include: { items: { include: { product: true } } },
    });
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
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getSales(tenantId: string, sessionId?: string) {
    return this.prisma.sale.findMany({
      where: { tenantId, ...(sessionId ? { cashierSessionId: sessionId } : {}) },
      include: { order: { include: { items: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
