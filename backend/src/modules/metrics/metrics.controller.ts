import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';
import { MetricsQueryDto, MetricsTimeseriesQueryDto, MetricsTopProductsQueryDto } from './dto/metrics.dto';
import { buildReportPdf } from './pdf/build-report-pdf';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('metrics')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Roles(Role.ADMIN)
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: any, @Query() query: MetricsQueryDto) {
    return this.metricsService.getSummary(user.tenantId, query.from, query.to);
  }

  @Get('timeseries')
  getTimeseries(@CurrentUser() user: any, @Query() query: MetricsTimeseriesQueryDto) {
    return this.metricsService.getTimeseries(user.tenantId, query.from, query.to, query.granularity ?? 'day');
  }

  @Get('payment-methods')
  getPaymentMethods(@CurrentUser() user: any, @Query() query: MetricsQueryDto) {
    return this.metricsService.getPaymentMethods(user.tenantId, query.from, query.to);
  }

  @Get('expense-breakdown')
  getExpenseBreakdown(@CurrentUser() user: any, @Query() query: MetricsQueryDto) {
    return this.metricsService.getExpenseBreakdown(user.tenantId, query.from, query.to);
  }

  @Get('top-products')
  getTopProducts(@CurrentUser() user: any, @Query() query: MetricsTopProductsQueryDto) {
    return this.metricsService.getTopProducts(user.tenantId, query.from, query.to, query.limit ?? 10);
  }

  @Get('report.pdf')
  async getReportPdf(@CurrentUser() user: any, @Query() query: MetricsQueryDto, @Res() res: Response) {
    const report = await this.metricsService.getFullReport(user.tenantId, query.from, query.to);
    const buffer = await buildReportPdf(report);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${query.from}-${query.to}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
