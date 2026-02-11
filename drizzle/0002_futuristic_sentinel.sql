CREATE TABLE "orderItems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"productId" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"price" real DEFAULT 0 NOT NULL,
	"orderId" uuid
);
--> statement-breakpoint
ALTER TABLE "orderItems" ADD CONSTRAINT "orderItems_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;