import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollPeriodDto, UpdatePayrollEntryDto, MarkPaidDto } from './dto/payroll.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('payroll')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Get('periods')
  findPeriods(@CurrentUser() user: any) { return this.payrollService.findPeriods(user.tenantId); }

  @Get('periods/:id')
  getPeriod(@CurrentUser() user: any, @Param('id') id: string) {
    return this.payrollService.getPeriod(user.tenantId, id);
  }

  @Post('periods')
  createPeriod(@CurrentUser() user: any, @Body() dto: CreatePayrollPeriodDto) {
    return this.payrollService.createPeriod(user.tenantId, dto);
  }

  @Patch('periods/:id/close')
  closePeriod(@CurrentUser() user: any, @Param('id') id: string) {
    return this.payrollService.closePeriod(user.tenantId, id);
  }

  @Patch('entries/:id')
  updateEntry(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdatePayrollEntryDto) {
    return this.payrollService.updateEntry(user.tenantId, id, dto);
  }

  @Patch('entries/:id/paid')
  markEntryPaid(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: MarkPaidDto) {
    return this.payrollService.markEntryPaid(user.tenantId, id, dto);
  }
}
