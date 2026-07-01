import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { CashierService } from './cashier.service';
import { OpenCashierDto, CloseCashierDto } from './dto/cashier.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

class AddExpenseDto {
  @IsString() description: string;
  @IsNumber() @Min(0) @Type(() => Number) amount: number;
  @IsOptional() @IsString() notes?: string;
}

@Controller('cashier')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CashierController {
  constructor(private cashierService: CashierService) {}

  @Get('active')
  getActive(@CurrentUser() user: any) { return this.cashierService.getActive(user.tenantId); }

  @Post('open')
  open(@CurrentUser() user: any, @Body() dto: OpenCashierDto) {
    return this.cashierService.open(user.tenantId, user.id, dto);
  }

  @Patch(':id/close')
  close(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CloseCashierDto) {
    return this.cashierService.close(user.tenantId, id, dto);
  }

  @Post(':id/expenses')
  addExpense(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AddExpenseDto) {
    return this.cashierService.addExpense(user.tenantId, id, dto.description, dto.amount, dto.notes);
  }

  @Get('history')
  findHistory(@CurrentUser() user: any) { return this.cashierService.findHistory(user.tenantId); }

  @Get(':id/report')
  getReport(@CurrentUser() user: any, @Param('id') id: string) {
    return this.cashierService.getReport(user.tenantId, id);
  }
}
