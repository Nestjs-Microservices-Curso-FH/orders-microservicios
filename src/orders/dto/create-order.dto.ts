import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { OrderStatus } from '../schema';

export class CreateOrderDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'totalAmount: El valor minio es cero (0)' })
  @Type(() => Number)
  totalAmount: number;

  @IsInt({ message: 'totalItem, su valo res un numeo entero' })
  @Min(0, { message: 'totalItems, su valor minio es cero (0)' })
  @Type(() => Number)
  totalItems: number;

  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'Estatus: su valor es PENDING | DELIVERED | CANCELLED',
  })
  status: OrderStatus = OrderStatus.PENDING;

  @IsOptional()
  @IsBoolean({ message: 'paid, debe ser un valor booleano (true | false)' })
  @Type(() => Boolean)
  paid: boolean = false;
}
