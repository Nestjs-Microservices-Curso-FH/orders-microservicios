import { sql } from 'drizzle-orm';
import { timestamp } from 'drizzle-orm/pg-core';

export const pgtimestamp = {
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').default(sql`now()`),
  //   createdAt: timestamp('created_at').defaultNow().notNull(),
  //   updatedAt: timestamp('updated_at')
  //     .defaultNow()
  //     .$onUpdate(() => new Date())
  //     .notNull(),
};
