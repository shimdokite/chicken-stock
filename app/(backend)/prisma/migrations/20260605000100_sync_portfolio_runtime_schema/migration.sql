-- Align the live portfolio tables with the current Prisma schema used by the
-- order and exchange APIs.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS "Portfolio_id_seq";

SELECT setval(
  '"Portfolio_id_seq"',
  COALESCE((SELECT MAX("id") FROM "Portfolio"), 0) + 1,
  false
);

ALTER SEQUENCE "Portfolio_id_seq" OWNED BY "Portfolio"."id";

ALTER TABLE "Portfolio"
  ALTER COLUMN "id" SET DEFAULT nextval('"Portfolio_id_seq"');

ALTER TABLE "Portfolio_transaction"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN "stock_id" DROP NOT NULL,
  ALTER COLUMN "trade_order_id" DROP NOT NULL,
  ALTER COLUMN "fee" SET DEFAULT 0;

ALTER TABLE "Portfolio_transaction"
  ADD COLUMN IF NOT EXISTS "purchase_amount" DECIMAL(20, 2),
  ADD COLUMN IF NOT EXISTS "realized_profit" DECIMAL(20, 2),
  ADD COLUMN IF NOT EXISTS "exchange_type" VARCHAR(16),
  ADD COLUMN IF NOT EXISTS "paid_amount" DECIMAL(20, 2),
  ADD COLUMN IF NOT EXISTS "received_amount" DECIMAL(20, 2),
  ADD COLUMN IF NOT EXISTS "exchange_rate" DECIMAL(20, 4);

ALTER TABLE "Portfolio_item"
  ALTER COLUMN "company_logo_url" TYPE VARCHAR(2048);
