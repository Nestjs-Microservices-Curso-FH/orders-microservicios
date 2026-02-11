ALTER TABLE "orders" ALTER COLUMN "paid_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "paid_at" DROP NOT NULL;