import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateProductDto, UpdateProductDto, CreateOrderDto, PayOrderDto } from './dto/store.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('store')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StoreController {
  constructor(private storeService: StoreService) {}

  @Get('products')
  getProducts(@CurrentUser() user: any) { return this.storeService.getProducts(user.tenantId); }

  @Post('products')
  createProduct(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.storeService.createProduct(user.tenantId, dto);
  }

  @Patch('products/:id')
  updateProduct(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.storeService.updateProduct(user.tenantId, id, dto);
  }

  @Get('orders')
  getActiveOrders(@CurrentUser() user: any) { return this.storeService.getActiveOrders(user.tenantId); }

  @Post('orders')
  createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.storeService.createOrder(user.tenantId, dto);
  }

  @Post('orders/:id/pay')
  payOrder(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: PayOrderDto) {
    return this.storeService.payOrder(user.tenantId, id, dto);
  }

  @Get('sales')
  getSales(@CurrentUser() user: any, @Query('sessionId') sessionId?: string) {
    return this.storeService.getSales(user.tenantId, sessionId);
  }
}
