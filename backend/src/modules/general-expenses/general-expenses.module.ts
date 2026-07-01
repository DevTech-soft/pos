import { Module } from '@nestjs/common';
import { GeneralExpensesService } from './general-expenses.service';
import { GeneralExpensesController } from './general-expenses.controller';

@Module({
  providers: [GeneralExpensesService],
  controllers: [GeneralExpensesController],
})
export class GeneralExpensesModule {}
