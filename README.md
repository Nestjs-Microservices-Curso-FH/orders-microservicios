# Orders Microservice

<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

## Description

Microservicio de gestión de órdenes construido con **NestJS** que maneja el ciclo de vida completo de órdenes de compra. Se comunica mediante **TCP** y utiliza **PostgreSQL** con **Drizzle ORM**.

## Technologies

- **NestJS** 11 - Framework progresivo de Node.js
- **Drizzle ORM** 0.45 - ORM type-safe para PostgreSQL
- **PostgreSQL** - Base de datos relacional
- **TypeScript** 5.7 - Lenguaje de desarrollo
- **Jest** 30 - Framework de testing
- **Joi** 18 - Validación de esquemas

## Available Scripts

### Development

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `pnpm start`       | Inicia la aplicación en modo producción  |
| `pnpm start:dev`   | Inicia en modo desarrollo con hot-reload |
| `pnpm start:debug` | Inicia con debugger activado             |
| `pnpm start:prod`  | Ejecuta la versión compilada en dist/    |

### Build

| Command      | Description                                   |
| ------------ | --------------------------------------------- |
| `pnpm build` | Compila la aplicación TypeScript a JavaScript |

### Testing

| Command           | Description                           |
| ----------------- | ------------------------------------- |
| `pnpm test`       | Ejecuta tests unitarios               |
| `pnpm test:watch` | Ejecuta tests en modo watch           |
| `pnpm test:cov`   | Genera reporte de cobertura           |
| `pnpm test:debug` | Ejecuta tests con debugger de Node.js |
| `pnpm test:e2e`   | Ejecuta tests end-to-end              |

### Database (Drizzle Kit)

| Command            | Description                                        |
| ------------------ | -------------------------------------------------- |
| `pnpm db:generate` | Genera archivos de migración SQL                   |
| `pnpm db:migrate`  | Ejecuta migraciones pendientes en la base de datos |
| `pnpm db:studio`   | Abre Drizzle Studio (UI para gestionar la BD)      |

### Code Quality

| Command       | Description                                        |
| ------------- | -------------------------------------------------- |
| `pnpm lint`   | Ejecuta ESLint con auto-fix en archivos TypeScript |
| `pnpm format` | Formatea código con Prettier                       |

## Installation

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones
```

## Environment Variables

Crear archivo `.env` con las siguientes variables:

```env
# Puerto del microservicio TCP
PORT=3002

# URL de conexión a PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/orders_db
```

## Usage

Este microservicio funciona como **servidor TCP** y expone los siguientes patrones de mensajes:

| Pattern         | Input                | Output         | Description                                                   |
| --------------- | -------------------- | -------------- | ------------------------------------------------------------- |
| `createOrder`   | `CreateOrderDto`     | Order          | Crea una nueva orden de compra                                |
| `findAllOrders` | `PaginationOrderDto` | `{data, meta}` | Lista órdenes paginadas con filtro por estado                 |
| `findOneOrder`  | `{id: string}`       | Order          | Obtiene una orden específica por UUID                         |
| `changeStatus`  | `StatusOrderDto`     | Order          | Cambia el estado de una orden (PENDING, DELIVERED, CANCELLED) |

### Order Status

- `PENDING` - Orden pendiente de procesamiento
- `DELIVERED` - Orden entregada
- `CANCELLED` - Orden cancelada

## Architecture

```
src/
├── config/               # Configuración centralizada (envs)
├── database/             # Módulo de base de datos (Drizzle + PostgreSQL)
├── orders/               # Módulo principal de órdenes
│   ├── dto/              # Data Transfer Objects
│   ├── schema/           # Esquemas de Drizzle ORM
│   ├── orders.controller.ts   # Controlador con MessagePatterns
│   ├── orders.service.ts      # Lógica de negocio
│   └── orders.module.ts       # Módulo de órdenes
├── common/               # Recursos compartidos
├── app.module.ts         # Módulo raíz
└── main.ts              # Punto de entrada
```

### Database Schema

**orders** table:

- `id` (UUID, PK) - Identificador único
- `total_amount` (REAL) - Monto total de la orden
- `total_items` (INTEGER) - Cantidad total de items
- `status` (ENUM) - Estado de la orden
- `paid` (BOOLEAN) - Indica si está pagada
- `paid_at` (TIMESTAMP) - Fecha de pago
- `created_at` / `updated_at` (TIMESTAMP) - Timestamps automáticos

**orderItems** table:

- `id` (UUID, PK) - Identificador único
- `productId` (INTEGER) - ID del producto
- `quantity` (INTEGER) - Cantidad comprada
- `price` (REAL) - Precio unitario
- `orderId` (UUID, FK) - Referencia a la orden

## Author

Your Name

## License

UNLICENSED
