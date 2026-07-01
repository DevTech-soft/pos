import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AccessModule } from './modules/access/access.module';
import { CashierModule } from './modules/cashier/cashier.module';
import { StoreModule } from './modules/store/store.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { GeneralExpensesModule } from './modules/general-expenses/general-expenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AccessModule,
    CashierModule,
    StoreModule,
    InventoryModule,
    EmployeesModule,
    PayrollModule,
    GeneralExpensesModule,
  ],
})
export class AppModule {}
