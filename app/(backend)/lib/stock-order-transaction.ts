function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getOrderTransactionErrorCode(error: unknown) {
  if (!isRecord(error)) {
    return null;
  }

  if (isRecord(error.meta) && typeof error.meta.code === "string") {
    return error.meta.code;
  }

  return typeof error.code === "string" ? error.code : null;
}

export function isRetryableOrderTransactionError(error: unknown) {
  const code = getOrderTransactionErrorCode(error);

  return code === "P2034" || code === "40001" || code === "40P01";
}
