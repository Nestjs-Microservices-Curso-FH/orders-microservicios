import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';

import { PaginationDto } from 'src/common';
import { OrderStatus } from '../schema';

export class PaginationOrderDto extends PartialType(PaginationDto) {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'estatus: su valor es PENDING | DELIVERED | CANCELLED',
  })
  status: OrderStatus = OrderStatus.PENDING;
}
