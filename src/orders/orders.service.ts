/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateOrderDto, StatusOrderDto } from './dto';
import { DATABASE_CONNECTION } from 'src/database/database-connection';

import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { order as orderSchema, orderItem as orderItemSchema } from './schema';
import { and, eq, sql } from 'drizzle-orm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PaginationOrderDto } from './dto/pagination-order.dto';
import { PRODUCT_SERVICE } from 'src/config';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<{
      orders: typeof orderSchema;
      orderItems: typeof orderItemSchema;
    }>,

    @Inject(PRODUCT_SERVICE)
    private readonly productsClient: ClientProxy,
  ) {
    // super();
  }

  async create(createOrderDto: CreateOrderDto) {
    // 1.- Conformar los ids de los productos
    const ids = createOrderDto.items.map((product) => product.productId);
    const productsFinds = await firstValueFrom(
      this.productsClient.send({ cmd: 'validate_products' }, ids).pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      ),
    );

    // 2.- Calculo de los valores de los productos
    const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
      const price = productsFinds.find(
        (product) => product.id === orderItem.productId,
      ).price;
      return acc + price * orderItem.quantity;
    }, 0);

    const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
      return acc + orderItem.quantity;
    }, 0);

    // 3.- Crear registro en base datos usando transacción
    const { order, items } = await this.db.transaction(async (tx) => {
      // Insertar orden
      const [newOrder] = await tx
        .insert(orderSchema)
        .values({
          status: 'PENDING',
          totalAmount,
          totalItems,
        })
        .returning();

      // Insertar items de la orden
      const orderItems = createOrderDto.items.map((item) => {
        const product = productsFinds.find((p) => p.id === item.productId);
        return {
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
        };
      });

      const insertedItems = await tx
        .insert(orderItemSchema)
        .values(orderItems)
        .returning();

      return { order: newOrder, items: insertedItems };
    });

    // Enriquecer items con datos de producto
    const itemsWithProducts = items.map((item) => {
      const product = productsFinds.find((p) => p.id === item.productId);
      return {
        id: item.id,
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      };
    });

    this.logger.log(`Order created with id: ${order.id}`);

    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      totalItems: order.totalItems,
      paid: order.paid,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: itemsWithProducts,
    };
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
        .where(eq(orderSchema.status, status.toString())),
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
