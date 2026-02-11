import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateOrderDto, StatusOrderDto } from './dto';
import { DATABASE_CONNECTION } from 'src/database/database-connection';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { order as orderSchema } from './schema';
import { and, eq, sql } from 'drizzle-orm';
import { RpcException } from '@nestjs/microservices';
import { PaginationOrderDto } from './dto/pagination-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<{ orders: typeof orderSchema }>,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { paid, ...restOrders } = createOrderDto;
    const result = await this.db
      .insert(orderSchema)
      .values({
        ...restOrders,
        paid,
        paidAt: paid ? new Date() : null,
      })
      .returning();

    this.logger.log(`Order create ${result[0].id}`);
    return result[0];
  }

  async findAll(paginationDto: PaginationOrderDto) {
    const { limit = 10, page = 1, status } = paginationDto;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      this.db
        .select()
        .from(orderSchema)
        .limit(limit)
        .offset(offset)
        .where(eq(orderSchema.status, status)),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(orderSchema)
        .where(eq(orderSchema.status, status)),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return {
      data: data.map((order) => ({
        ...order,
        createdAt: new Date(order.createdAt).toISOString(),
        updatedAt: new Date(order.updatedAt).toISOString(),
      })),
      meta: { total, limit, totalPages: Math.ceil(total / limit), page },
    };
  }

  async findOne(id: string) {
    const result = await this.db
      .select()
      .from(orderSchema)
      .where(and(eq(orderSchema.id, id)));

    if (!result[0]) {
      const thisErr = `Order with id ${id} not found`;
      this.logger.error(thisErr);
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: thisErr,
      });
    }

    return {
      ...result[0],
      // isAvailable: !!result[0].isAvailable,
      createdAt: new Date(result[0].createdAt).toISOString(),
      updatedAt: new Date(result[0].updatedAt).toISOString(),
    };
  }

  async changeStatus(statusOrderDto: StatusOrderDto) {
    const { id, status } = statusOrderDto;
    const findOrder = await this.findOne(id);

    if (findOrder.status === status.toString()) {
      return findOrder;
    }

    const result = await this.db
      .update(orderSchema)
      .set({
        status: statusOrderDto.status,
      })
      .where(eq(orderSchema.id, findOrder.id))
      .returning();

    this.logger.log(
      `Order ${id} has changed status to: ${statusOrderDto.status}`,
    );
    return result[0];
  }
}
