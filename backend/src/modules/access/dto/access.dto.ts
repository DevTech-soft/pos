import { IsString, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterEntryDto {
  @IsOptional()
  @IsString()
  visitorName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  pax?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RegisterExitDto {
  @IsOptional()
  @IsDateString()
  exitTime?: string;
}
