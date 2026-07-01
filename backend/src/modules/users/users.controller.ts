import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findAll(@CurrentUser() user: any, @Query('tenantId') tenantId?: string) {
    const resolvedTenantId = user.role === Role.SUPERADMIN ? tenantId : user.tenantId;
    return this.usersService.findAll(resolvedTenantId);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  findOne(@Param('id') id: string) { return this.usersService.findOne(id); }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    if (user.role !== Role.SUPERADMIN) dto.tenantId = user.tenantId;
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
}
