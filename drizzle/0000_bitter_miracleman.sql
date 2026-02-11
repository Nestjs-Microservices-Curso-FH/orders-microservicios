CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_amount" real DEFAULT 0 NOT NULL,
	"total_items" integer DEFAULT 0 NOT NULL,
	"status" "status" NOT NULL,
	"paid" boolean DEFAULT false,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
