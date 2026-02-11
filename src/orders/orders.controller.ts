import { Controller, Logger, ParseUUIDPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto, PaginationOrderDto, StatusOrderDto } from './dto';

@Controller()
export class OrdersController {
  private readonly logger = new Logger(OrdersService.name);
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  create(@Payload() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @MessagePattern('findAllOrders')
  findAll(@Payload() paginationDto: PaginationOrderDto) {
    this.logger.log({ ...paginationDto });
    return this.ordersService.findAll(paginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  @MessagePattern('changeStatus')
  changeOrderStatus(@Payload() statusOrderDto: StatusOrderDto) {
    return this.ordersService.changeStatus({ ...statusOrderDto });
  }
}
