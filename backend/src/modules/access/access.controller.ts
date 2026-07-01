import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AccessService } from './access.service';
import { RegisterEntryDto, RegisterExitDto } from './dto/access.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('access')
@UseGuards(JwtAuthGuard, TenantGuard)
export class AccessController {
  constructor(private accessService: AccessService) {}

  @Post('entry')
  registerEntry(@CurrentUser() user: any, @Body() dto: RegisterEntryDto) {
    return this.accessService.registerEntry(user.tenantId, dto);
  }

  @Patch(':id/exit')
  registerExit(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RegisterExitDto) {
    return this.accessService.registerExit(user.tenantId, id, dto);
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
