import { createHash } from "node:crypto";

type DecimalValue = number | string | { toString(): string };

export type StockOrderRequestIdentity = {
  orderPriceType: "LIMIT" | "MARKET";
  pricePerShare: DecimalValue | null;
  quantity: number;
  stockId: number;
  type: "BUY" | "SELL";
  userId: bigint;
};

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

export function parseIdempotencyKey(value: string | null) {
  return value && IDEMPOTENCY_KEY_PATTERN.test(value) ? value : null;
}

export function createStockOrderRequestHash(input: StockOrderRequestIdentity) {
  const price =
    input.orderPriceType === "MARKET"
      ? null
      : Number(input.pricePerShare?.toString() ?? 0).toFixed(2);
  const normalizedIntent = {
    orderPriceType: input.orderPriceType,
    pricePerShare: price,
    quantity: input.quantity,
    stockId: input.stockId,
    type: input.type,
    userId: input.userId.toString(),
  };

  return createHash("sha256")
    .update(JSON.stringify(normalizedIntent))
    .digest("hex");
}
