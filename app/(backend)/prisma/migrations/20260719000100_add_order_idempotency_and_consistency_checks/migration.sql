ALTER TABLE "Trade_order"
  ADD COLUMN "idempotency_key" VARCHAR(128),
  ADD COLUMN "idempotency_request_hash" CHAR(64);

UPDATE "Trade_order"
SET "remaining_quantity" = 0
WHERE "status" = 'CANCELED'::"Trade_order_status"
  AND "remaining_quantity" <> 0;

ALTER TABLE "Portfolio"
  ADD CONSTRAINT "Portfolio_krw_balance_nonnegative_check"
    CHECK ("krw_balance" >= 0) NOT VALID,
  ADD CONSTRAINT "Portfolio_usd_balance_nonnegative_check"
    CHECK ("usd_balance" >= 0) NOT VALID;

ALTER TABLE "Portfolio_item"
  ADD CONSTRAINT "Portfolio_item_quantity_nonnegative_check"
    CHECK ("quantity" >= 0) NOT VALID;

ALTER TABLE "Trade_order"
  ADD CONSTRAINT "Trade_order_quantity_positive_check"
    CHECK ("quantity" > 0) NOT VALID,
  ADD CONSTRAINT "Trade_order_filled_quantity_nonnegative_check"
    CHECK ("filled_quantity" >= 0) NOT VALID,
  ADD CONSTRAINT "Trade_order_remaining_quantity_nonnegative_check"
    CHECK ("remaining_quantity" >= 0) NOT VALID,
  ADD CONSTRAINT "Trade_order_quantity_sum_check"
    CHECK (
      (
        "status" = 'CANCELED'::"Trade_order_status"
        AND "remaining_quantity" = 0
        AND "filled_quantity" <= "quantity"
      )
      OR
      (
        "status" <> 'CANCELED'::"Trade_order_status"
        AND "filled_quantity" + "remaining_quantity" = "quantity"
      )
    ) NOT VALID,
  ADD CONSTRAINT "Trade_order_idempotency_pair_check"
    CHECK (
      ("idempotency_key" IS NULL AND "idempotency_request_hash" IS NULL)
      OR
      ("idempotency_key" IS NOT NULL AND "idempotency_request_hash" IS NOT NULL)
    ) NOT VALID;

ALTER TABLE "Portfolio"
  VALIDATE CONSTRAINT "Portfolio_krw_balance_nonnegative_check";
ALTER TABLE "Portfolio"
  VALIDATE CONSTRAINT "Portfolio_usd_balance_nonnegative_check";
ALTER TABLE "Portfolio_item"
  VALIDATE CONSTRAINT "Portfolio_item_quantity_nonnegative_check";
ALTER TABLE "Trade_order"
  VALIDATE CONSTRAINT "Trade_order_quantity_positive_check";
ALTER TABLE "Trade_order"
  VALIDATE CONSTRAINT "Trade_order_filled_quantity_nonnegative_check";
ALTER TABLE "Trade_order"
  VALIDATE CONSTRAINT "Trade_order_remaining_quantity_nonnegative_check";
ALTER TABLE "Trade_order"
  VALIDATE CONSTRAINT "Trade_order_quantity_sum_check";
ALTER TABLE "Trade_order"
  VALIDATE CONSTRAINT "Trade_order_idempotency_pair_check";
