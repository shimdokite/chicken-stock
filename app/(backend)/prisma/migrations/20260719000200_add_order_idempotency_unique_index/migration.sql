CREATE UNIQUE INDEX CONCURRENTLY "Trade_order_portfolio_id_idempotency_key_key"
  ON "Trade_order"("portfolio_id", "idempotency_key");
