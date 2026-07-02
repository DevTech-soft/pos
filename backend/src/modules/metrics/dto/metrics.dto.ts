import { IsDateString, IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MetricsQueryDto {
  @IsDateString() from: string;
  @IsDateString() to: string;
}

export class MetricsTimeseriesQueryDto extends MetricsQueryDto {
  @IsOptional() @IsIn(['day', 'week', 'month']) granularity?: 'day' | 'week' | 'month';
}

export class MetricsTopProductsQueryDto extends MetricsQueryDto {
  @IsOptional() @IsInt() @Min(1) @Max(50) @Type(() => Number) limit?: number;
}
