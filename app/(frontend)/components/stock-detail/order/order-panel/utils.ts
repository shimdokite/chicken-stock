import type { StockOrderBookLevelData } from "../../../../types/stock/stock-detail";

type MarketOrderType = "BUY" | "SELL";

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;

    if (response?.data?.message) {
      if (
        response.data.message === "인증이 필요합니다." ||
        response.data.message === "Refresh token이 없습니다."
      ) {
        return "로그인 후 주문할 수 있습니다.";
      }

      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function parseQuantityInput(value: string) {
  const quantity = Number(value);

  return Number.isInteger(quantity) && quantity > 0 ? quantity : 0;
}

export function parsePriceInput(value: string) {
  const price = Number(value);

  return Number.isFinite(price) && price > 0 ? price : 0;
}

export function toInputValue(value: number) {
  return Number.isFinite(value) && value > 0 ? String(Math.floor(value)) : "";
}

export function getMaxBuyQuantity(buyingPower: number, price: number) {
  if (!Number.isFinite(buyingPower) || !Number.isFinite(price) || price <= 0) {
    return 0;
  }

  return Math.max(Math.floor(buyingPower / price), 0);
}

function getMarketLevelSide(type: MarketOrderType) {
  return type === "BUY" ? "ASK" : "BID";
}

function getSortedMarketLevels(
  levels: StockOrderBookLevelData[] | undefined,
  type: MarketOrderType,
) {
  const side = getMarketLevelSide(type);

  return [...(levels ?? [])]
    .filter(
      (level) =>
        level.side === side &&
        Number.isFinite(level.price) &&
        level.price > 0 &&
        Number.isFinite(level.quantity) &&
        level.quantity > 0,
    )
    .sort((left, right) =>
      type === "BUY" ? left.price - right.price : right.price - left.price,
    );
}

export function getMarketOrderAmountEstimate({
  currentPrice,
  levels,
  quantity,
  type,
}: {
  currentPrice: number;
  levels?: StockOrderBookLevelData[];
  quantity: number;
  type: MarketOrderType;
}) {
  if (
    quantity <= 0 ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0
  ) {
    return 0;
  }

  let remainingQuantity = quantity;
  let executionPrice = currentPrice;
  let orderAmount = 0;

  for (const level of getSortedMarketLevels(levels, type)) {
    if (remainingQuantity <= 0) {
      break;
    }

    const fillQuantity = Math.min(
      remainingQuantity,
      Math.floor(level.quantity),
    );

    executionPrice = level.price;
    orderAmount += executionPrice * fillQuantity;
    remainingQuantity -= fillQuantity;
  }

  if (remainingQuantity > 0) {
    orderAmount += executionPrice * remainingQuantity;
  }

  return Math.round(orderAmount * 100) / 100;
}

export function getMaxMarketBuyQuantity({
  buyingPower,
  currentPrice,
  levels,
}: {
  buyingPower: number;
  currentPrice: number;
  levels?: StockOrderBookLevelData[];
}) {
  if (
    buyingPower <= 0 ||
    !Number.isFinite(buyingPower) ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0
  ) {
    return 0;
  }

  let remainingBuyingPower = buyingPower;
  let executionPrice = currentPrice;
  let quantity = 0;

  for (const level of getSortedMarketLevels(levels, "BUY")) {
    if (remainingBuyingPower <= 0) {
      break;
    }

    const levelQuantity = Math.floor(level.quantity);
    const affordableQuantity = Math.floor(remainingBuyingPower / level.price);
    const fillQuantity = Math.min(levelQuantity, affordableQuantity);

    if (fillQuantity <= 0) {
      return quantity;
    }

    quantity += fillQuantity;
    executionPrice = level.price;
    remainingBuyingPower -= level.price * fillQuantity;

    if (fillQuantity < levelQuantity) {
      return quantity;
    }
  }

  if (remainingBuyingPower > 0) {
    quantity += Math.floor(remainingBuyingPower / executionPrice);
  }

  return quantity;
}

export function getQuantityByPercent(maxQuantity: number, percent: number) {
  if (maxQuantity <= 0) {
    return 0;
  }

  if (percent >= 100) {
    return maxQuantity;
  }

  return Math.max(Math.floor((maxQuantity * percent) / 100), 1);
}

export function getProfitTextClassName(profit: number) {
  if (profit > 0) {
    return "text-red-500";
  }

  if (profit < 0) {
    return "text-sky-600";
  }

  return "text-black";
}

export function formatQuantity(quantity: number) {
  return `${new Intl.NumberFormat("ko-KR").format(quantity)}주`;
}
