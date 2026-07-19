export function createStockOrderHeaders(idempotencyKey: string) {
  return {
    "Idempotency-Key": idempotencyKey,
  };
}
