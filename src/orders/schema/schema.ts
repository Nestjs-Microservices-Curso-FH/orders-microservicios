import { relations } from 'drizzle-orm';
import { timestamp } from 'drizzle-orm/pg-core';
import {
  pgTable,
  uuid,
  boolean,
  integer,
  real,
  pgEnum,
} from 'drizzle-orm/pg-core';

export enum OrderStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

const statusEnum = pgEnum(
  'status',
  Object.values(OrderStatus) as [string, ...string[]],
);

export const order = pgTable('orders', {
  id: uuid().primaryKey().defaultRandom(),
  totalAmount: real('total_amount').notNull().default(0),
  totalItems: integer('total_items').notNull().default(0),
  status: statusEnum('status').notNull(),
  paid: boolean().default(false),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const orderItem = pgTable('orderItems', {
  id: uuid().primaryKey().defaultRandom(),
  productId: integer('productId'),
  quantity: integer('quantity').notNull().default(0),
  price: real('price').notNull().default(0),

  orderId: uuid().references(() => order.id, { onDelete: 'cascade' }),
});

// relacion uno a muchos
export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
}));

export const orderRelations = relations(order, ({ many }) => ({
  orderItems: many(orderItem),
}));
