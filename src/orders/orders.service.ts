/* eslint-disable @typescript-eslint/no-unsafe-return */

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
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    // Step 1: Validate products exist and get their details
    const products = await this.validateProducts(createOrderDto.items);

    // Step 2: Calculate order totals based on products and quantities
    const { totalAmount, totalItems } = this.calculateOrderTotals(
      createOrderDto.items,
      products,
    );

    // Step 3: Persist order and items atomically
    const { order, items } = await this.createOrderWithItems(
      createOrderDto.items,
      totalAmount,
      totalItems,
      products,
    );

    // Step 4: Enrich response with product details
    const itemsWithProducts = this.enrichOrderItemsWithProducts(
      items,
      products,
    );

    this.logger.log(`Order created with id: ${order.id}`);

    // Step 5: Build final response
    return this.buildOrderResponse(order, itemsWithProducts);
  }

  /**
   * Validates that all products in the order items exist by calling the product service.
   * Throws RpcException if validation fails.
   * @param items - Order items containing product IDs
   * @returns Array of validated products with their details
   */
  private async validateProducts(
    items: CreateOrderDto['items'],
  ): Promise<any[]> {
    const productIds = items.map((item) => item.productId);

    return firstValueFrom(
      this.productsClient.send({ cmd: 'validate_products' }, productIds).pipe(
        catchError((err) => {
          throw new RpcException(err);
        }),
      ),
    );
  }

  /**
   * Calculates the total amount and total items for an order.
   * Pure function - no side effects.
   * @param items - Order items with quantities
   * @param products - Validated products with prices
   * @returns Object containing totalAmount and totalItems
   */
  private calculateOrderTotals(
    items: CreateOrderDto['items'],
    products: any[],
  ): { totalAmount: number; totalItems: number } {
    const totalAmount = items.reduce((acc, item) => {
      const product = products.find((p) => p.id === item.productId);
      return acc + product.price * item.quantity;
    }, 0);

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

    return { totalAmount, totalItems };
  }

  /**
   * Creates an order and its items in a database transaction.
   * If any operation fails, the entire transaction is rolled back.
   * @param items - Order items to create
   * @param totalAmount - Calculated total amount
   * @param totalItems - Calculated total items
   * @param products - Validated products for price lookup
   * @returns Object containing the created order and its items
   * @throws RpcException if transaction fails
   */
  private async createOrderWithItems(
    items: CreateOrderDto['items'],
    totalAmount: number,
    totalItems: number,
    products: any[],
  ): Promise<{ order: any; items: any[] }> {
    try {
      return await this.db.transaction(async (tx) => {
        // Insert the main order record
        const [newOrder] = await tx
          .insert(orderSchema)
          .values({
            status: 'PENDING',
            totalAmount,
            totalItems,
          })
          .returning();

        // Prepare order items with order ID and prices
        const orderItems = items.map((item) => {
          const product = products.find((p) => p.id === item.productId);
          return {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
          };
        });

        // Insert all order items
        const insertedItems = await tx
          .insert(orderItemSchema)
          .values(orderItems)
          .returning();

        return { order: newOrder, items: insertedItems };
      });
    } catch (error) {
      this.logger.error(
        `Failed to create order transaction: ${error.message}`,
        error.stack,
      );

      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create order. Transaction rolled back.',
        error: error.message,
      });
    }
  }

  /**
   * Enriches order items with product details (name, price) for the response.
   * Pure function - no side effects.
   * @param items - Database order items
   * @param products - Validated products with details
   * @returns Enriched order items with product information and totals
   */
  private enrichOrderItemsWithProducts(items: any[], products: any[]): any[] {
    return items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        id: item.id,
        productId: item.productId,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      };
    });
  }

  /**
   * Builds the final order response object.
   * Pure function - no side effects.
   * @param order - The created order from database
   * @param items - Enriched order items
   * @returns Formatted order response
   */
  private buildOrderResponse(order: any, items: any[]): any {
    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      totalItems: order.totalItems,
      paid: order.paid,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items,
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
    // Step 1: Fetch the order
    const orderResult = await this.db
      .select()
      .from(orderSchema)
      .where(and(eq(orderSchema.id, id)));

    if (!orderResult[0]) {
      const thisErr = `Order with id ${id} not found`;
      this.logger.error(thisErr);
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: thisErr,
      });
    }

    const order = orderResult[0];

    // Step 2: Fetch order items
    const items = await this.db
      .select()
      .from(orderItemSchema)
      .where(eq(orderItemSchema.orderId, id));

    // Step 3: Enrich items with product details if items exist
    let enrichedItems: any[] = [];
    if (items.length > 0) {
      const productIds = items
        .map((item) => item.productId)
        .filter((id): id is number => id !== null);
      const products = await this.getProductsByIds(productIds);
      enrichedItems = this.enrichOrderItemsWithProducts(items, products);
    }

    // Step 4: Build and return response
    const response = this.buildOrderResponse(order, enrichedItems);
    return {
      ...response,
      createdAt: new Date(order.createdAt).toISOString(),
      updatedAt: new Date(order.updatedAt).toISOString(),
    };
  }

  /**
   * Fetches product details by their IDs from the product service.
   * @param productIds - Array of product IDs to fetch
   * @returns Array of products with their details
   * @throws RpcException if the product service fails
   */
  private async getProductsByIds(productIds: number[]): Promise<any[]> {
    if (productIds.length === 0) {
      return [];
    }

    return firstValueFrom(
      this.productsClient.send({ cmd: 'validate_products' }, productIds).pipe(
        catchError((err) => {
          this.logger.error(
            `Failed to fetch products: ${err.message}`,
            err.stack,
          );
          throw new RpcException({
            status: HttpStatus.BAD_GATEWAY,
            message: 'Failed to fetch product details',
            error: err.message,
          });
        }),
      ),
    );
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
