-- CreateTable
CREATE TABLE "Trade_execution" (
    "id" VARCHAR(255) NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "ticker" VARCHAR(255) NOT NULL,
    "buy_order_id" BIGINT,
    "sell_order_id" BIGINT,
    "price" DECIMAL(20,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "aggressor_side" "Trade_order_type" NOT NULL,
    "executed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_execution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_execution_stock_id_executed_at_idx" ON "Trade_execution"("stock_id", "executed_at");

-- CreateIndex
CREATE INDEX "Trade_execution_buy_order_id_idx" ON "Trade_execution"("buy_order_id");

-- CreateIndex
CREATE INDEX "Trade_execution_sell_order_id_idx" ON "Trade_execution"("sell_order_id");

-- AddForeignKey
ALTER TABLE "Trade_execution" ADD CONSTRAINT "Trade_execution_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade_execution" ADD CONSTRAINT "Trade_execution_buy_order_id_fkey" FOREIGN KEY ("buy_order_id") REFERENCES "Trade_order"("order_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade_execution" ADD CONSTRAINT "Trade_execution_sell_order_id_fkey" FOREIGN KEY ("sell_order_id") REFERENCES "Trade_order"("order_id") ON DELETE SET NULL ON UPDATE CASCADE;
