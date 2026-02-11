import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { OrderStatus } from '../schema';

export class StatusOrderDto {
  @IsString()
  @IsUUID(4)
  id: string;

  @IsNotEmpty({ message: 'El estatus es requerido' })
  @IsEnum(OrderStatus, {
    message: `status su valor es uno de: ${Object.values(OrderStatus).join(', ')}`,
  })
  status: OrderStatus;
}
