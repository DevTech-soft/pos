import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { CreateSpaceDto, UpdateSpaceDto, CreateRentalDto, SettleRentalDto } from './dto/rental.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('rentals')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class RentalsController {
  constructor(private rentalsService: RentalsService) {}

  // Espacios
  @Get('spaces')
  getSpaces(@CurrentUser() user: any) {
    return this.rentalsService.getSpaces(user.tenantId);
  }

  @Post('spaces')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  createSpace(@CurrentUser() user: any, @Body() dto: CreateSpaceDto) {
    return this.rentalsService.createSpace(user.tenantId, dto);
  }

  @Patch('spaces/:id')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  updateSpace(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateSpaceDto) {
    return this.rentalsService.updateSpace(user.tenantId, id, dto);
  }

  // Reservas
  @Get()
  getRentals(@CurrentUser() user: any) {
    return this.rentalsService.getRentals(user.tenantId);
  }

  @Post()
  createRental(@CurrentUser() user: any, @Body() dto: CreateRentalDto) {
    return this.rentalsService.createRental(user.tenantId, dto);
  }

  @Post(':id/cancel')
  cancelRental(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rentalsService.cancelRental(user.tenantId, id);
  }

  @Post(':id/complete')
  completeRental(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rentalsService.completeRental(user.tenantId, id);
  }

  @Get('open-tabs')
  getOpenTabs(@CurrentUser() user: any) {
    return this.rentalsService.getOpenTabs(user.tenantId);
  }

  @Post(':id/settle')
  settleRental(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SettleRentalDto) {
    return this.rentalsService.settleRental(user.tenantId, id, dto);
  }

  @Get('sales')
  getPaidRentals(@CurrentUser() user: any) {
    return this.rentalsService.getPaidRentals(user.tenantId);
  }
}
