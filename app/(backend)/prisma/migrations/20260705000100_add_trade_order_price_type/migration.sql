CREATE TYPE "Trade_order_price_type" AS ENUM ('LIMIT', 'MARKET');

ALTER TABLE "Trade_order"
ADD COLUMN "order_price_type" "Trade_order_price_type" NOT NULL DEFAULT 'LIMIT';
