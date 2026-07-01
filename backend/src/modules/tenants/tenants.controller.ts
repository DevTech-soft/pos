import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPERADMIN)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  findAll() { return this.tenantsService.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.tenantsService.findOne(id); }

  @Post()
  create(@Body() dto: CreateTenantDto) { return this.tenantsService.create(dto); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.tenantsService.remove(id); }
}
