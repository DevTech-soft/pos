import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  CreateProductDto, UpdateProductDto, CreateVariantDto, UpdateVariantDto, AdjustStockDto,
  CreateSupplierDto, UpdateSupplierDto, CreatePurchaseOrderDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.ADMIN)
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  // Products
  @Get('products')
  getProducts(@CurrentUser() user: any) { return this.inventoryService.getProducts(user.tenantId); }

  @Get('products/:id')
  getProduct(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.getProduct(user.tenantId, id);
  }

  @Post('products')
  createProduct(@CurrentUser() user: any, @Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(user.tenantId, dto);
  }

  @Patch('products/:id')
  updateProduct(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.inventoryService.updateProduct(user.tenantId, id, dto);
  }

  // Variants
  @Post('products/:productId/variants')
  addVariant(@CurrentUser() user: any, @Param('productId') productId: string, @Body() dto: CreateVariantDto) {
    return this.inventoryService.addVariant(user.tenantId, productId, dto);
  }

  @Patch('variants/:id')
  updateVariant(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.inventoryService.updateVariant(user.tenantId, id, dto);
  }

  @Post('variants/:id/adjust-stock')
  adjustStock(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(user.tenantId, id, dto);
  }

  // Suppliers
  @Get('suppliers')
  getSuppliers(@CurrentUser() user: any) { return this.inventoryService.getSuppliers(user.tenantId); }

  @Post('suppliers')
  createSupplier(@CurrentUser() user: any, @Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(user.tenantId, dto);
  }

  @Patch('suppliers/:id')
  updateSupplier(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.inventoryService.updateSupplier(user.tenantId, id, dto);
  }

  // Purchase Orders
  @Get('purchase-orders')
  getPurchaseOrders(@CurrentUser() user: any) { return this.inventoryService.getPurchaseOrders(user.tenantId); }

  @Get('purchase-orders/:id')
  getPurchaseOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.getPurchaseOrder(user.tenantId, id);
  }

  @Post('purchase-orders')
  createPurchaseOrder(@CurrentUser() user: any, @Body() dto: CreatePurchaseOrderDto) {
    return this.inventoryService.createPurchaseOrder(user.tenantId, user.id, dto);
  }

  @Post('purchase-orders/:id/receive')
  receivePurchaseOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.receivePurchaseOrder(user.tenantId, id);
  }

  @Post('purchase-orders/:id/cancel')
  cancelPurchaseOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.cancelPurchaseOrder(user.tenantId, id);
  }
}
