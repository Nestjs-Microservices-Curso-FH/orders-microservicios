import { Logger, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE_CONNECTION } from './database-connection';

import { order } from 'src/orders/schema';
import { envs } from 'src/config';

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [],
      useFactory: () => {
        const databaseURL = envs.database_url;
        const pool = new Pool({
          connectionString: databaseURL,
        });
        const db = drizzle({ client: pool, schema: { ...order } });

        Logger.log(`Database connected`, 'DatabaseModule');

        return db;
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
