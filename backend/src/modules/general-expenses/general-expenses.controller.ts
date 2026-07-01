import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { GeneralExpensesService } from './general-expenses.service';
import { CreateGeneralExpenseDto } from './dto/general-expense.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('general-expenses')
@UseGuards(JwtAuthGuard, TenantGuard)
export class GeneralExpensesController {
  constructor(private service: GeneralExpensesService) {}

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.findAll(user.tenantId, month ? +month : undefined, year ? +year : undefined);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateGeneralExpenseDto) {
    return this.service.create(user.tenantId, user.id, dto);
  }
}
