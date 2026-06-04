export type CurrencyCode = "KRW" | "USD";

// TODO: 추후 실제 환율로 변경 예정
export const USD_KRW_EXCHANGE_RATE = 1478.55;

export function convertCurrencyValue(
  value: number,
  fromCurrencyCode: CurrencyCode,
  toCurrencyCode: CurrencyCode,
) {
  if (fromCurrencyCode === toCurrencyCode) {
    return value;
  }

  return toCurrencyCode === "KRW"
    ? Math.round(value * USD_KRW_EXCHANGE_RATE)
    : value / USD_KRW_EXCHANGE_RATE;
}
