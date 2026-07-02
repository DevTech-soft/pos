import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AccessService } from './access.service';
import { RegisterEntryDto, RegisterExitDto, UpdateAccessPricingDto, SettleTabDto } from './dto/access.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('access')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AccessController {
  constructor(private accessService: AccessService) {}

  @Get('pricing')
  getPricing(@CurrentUser() user: any) {
    return this.accessService.getPricing(user.tenantId);
  }

  @Patch('pricing')
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  updatePricing(@CurrentUser() user: any, @Body() dto: UpdateAccessPricingDto) {
    return this.accessService.updatePricing(user.tenantId, dto);
  }

  @Post('entry')
  registerEntry(@CurrentUser() user: any, @Body() dto: RegisterEntryDto) {
    return this.accessService.registerEntry(user.tenantId, dto);
  }

  @Patch(':id/exit')
  registerExit(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RegisterExitDto) {
    return this.accessService.registerExit(user.tenantId, id, dto);
  }

  @Get('open-tabs')
  getOpenTabs(@CurrentUser() user: any) {
    return this.accessService.getOpenTabs(user.tenantId);
  }

  @Post(':id/settle')
  settleTab(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: SettleTabDto) {
    return this.accessService.settleTab(user.tenantId, id, dto);
  }

  @Get('sales')
  getPaidEntries(@CurrentUser() user: any) {
    return this.accessService.getPaidEntries(user.tenantId);
  }

  @Get('today')
  findToday(@CurrentUser() user: any) {
    return this.accessService.findToday(user.tenantId);
  }

  @Get('occupancy')
  getCurrentOccupancy(@CurrentUser() user: any) {
    return this.accessService.getCurrentOccupancy(user.tenantId);
  }

  @Get('by-date')
  findByDate(@CurrentUser() user: any, @Query('date') date: string) {
    return this.accessService.findByDate(user.tenantId, date);
  }

  @Get('stats')
  getDailyStats(@CurrentUser() user: any, @Query('date') date: string) {
    return this.accessService.getDailyStats(user.tenantId, date || new Date().toISOString().split('T')[0]);
  }
}
