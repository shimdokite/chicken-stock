import { requests } from "../request";
import type { StockData } from "../../components/main/stock_list/types";
import type { ChartCandleData } from "../../components/stock-detail/order/chart-panel/types";
import type { StockOrderBookSnapshotData } from "../../types/stock/stock-detail";

export const STOCKS_PAGE_SIZE = 10;

export type StockCandleInterval = "DAY" | "WEEK" | "MONTH";
export type StockTradeOrderType = "BUY" | "SELL";
export type StockTradeOrderStatus = "PENDING" | "COMPLETED" | "CANCELED";
export type StockOrderPriceType = "LIMIT" | "MARKET";

export type StocksPage = {
  stocks: StockData[];
  nextPage: number | null;
};

type StocksResponse =
  | {
      ok: true;
      data: StocksPage;
    }
  | {
      ok: false;
      error: string;
    };

type StockCandlesResponse =
  | {
      ok: true;
      data: {
        interval: StockCandleInterval;
        candles: ChartCandleData[];
      };
    }
  | {
      ok: false;
      error: string;
    };

type StockOrderBookResponse =
  | {
      ok: true;
      data: {
        orderBookSnapshot: StockOrderBookSnapshotData | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

export type StockPendingOrder = {
  canceledAt: string | null;
  currencyCode: "KRW" | "USD";
  executedAt: string | null;
  executedPrice: number | null;
  filledQuantity: number;
  orderId: string;
  orderedAt: string;
  pricePerShare: number;
  quantity: number;
  remainingQuantity: number;
  status: StockTradeOrderStatus;
  stockId: number;
  stockName: string;
  ticker: string;
  type: StockTradeOrderType;
};

export type StockOrderContext = {
  buyingPower: number;
  holding: {
    averagePrice: number;
    currentAmount: number;
    currentProfit: number;
    currentProfitRate: number;
    quantity: number;
    sellableQuantity: number;
    totalInvested: number;
  };
  pendingOrderCount: number;
  pendingOrders: StockPendingOrder[];
  stock: {
    currencyCode: "KRW" | "USD";
    currentPrice: number;
    id: number;
    name: string;
    ticker: string;
  };
  totalAvailableOrderAmount: number;
};

export type StockMutationSyncReason = "ORDER_CHANGED" | "TRADE_EXECUTED";

export type StockMarketSync = {
  candles: Partial<Record<StockCandleInterval, ChartCandleData[]>> | null;
  orderBookSnapshot: StockOrderBookSnapshotData | null;
  reason: StockMutationSyncReason;
};

export type StockMutationSync = StockMarketSync & {
  orderContext: StockOrderContext;
};

export type CreateStockOrderRequest = {
  orderPriceType: StockOrderPriceType;
  pricePerShare?: number;
  quantity: number;
  type: StockTradeOrderType;
};

export type UpdateStockOrderRequest = {
  pricePerShare: number;
  quantity: number;
};

type StockOrdersResponse =
  | {
      ok: true;
      data: StockOrderContext;
    }
  | {
      ok: false;
      error: string;
    };

type StockOrderMutationResponse =
  | {
      ok: true;
      data: {
        order: Omit<StockPendingOrder, "stockId" | "stockName">;
        sync: StockMutationSync | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

type StockOrderCancelResponse =
  | {
      ok: true;
      data: {
        canceledCount: number;
        sync: StockMutationSync | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

export async function fetchStocks(
  market: string,
  ranking: string,
  page: number,
) {
  const { data } = await requests.get<StocksResponse>("/api/stocks", {
    params: {
      market,
      ranking,
      market_status: "LISTED",
      page,
      limit: STOCKS_PAGE_SIZE,
    },
  });

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function fetchStockCandles(
  stockId: number,
  interval: StockCandleInterval,
) {
  const { data } = await requests.get<StockCandlesResponse>(
    `/api/stocks/${stockId}/candles`,
    {
      params: {
        interval,
      },
    },
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data.candles;
}

export async function fetchStockOrderBook(stockId: number) {
  const { data } = await requests.get<StockOrderBookResponse>(
    `/api/stocks/${stockId}/order-book`,
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data.orderBookSnapshot;
}

export async function fetchStockOrders(stockId: number) {
  const { data } = await requests.get<StockOrdersResponse>(
    `/api/stocks/${stockId}/orders`,
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function createStockOrder(
  stockId: number,
  payload: CreateStockOrderRequest,
) {
  const { data } = await requests.post<StockOrderMutationResponse>(
    `/api/stocks/${stockId}/orders`,
    payload,
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function updateStockOrder(
  stockId: number,
  orderId: string,
  payload: UpdateStockOrderRequest,
) {
  const { data } = await requests.patch<StockOrderMutationResponse>(
    `/api/stocks/${stockId}/orders/${orderId}`,
    payload,
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function cancelStockOrder(stockId: number, orderId: string) {
  const { data } = await requests.delete<StockOrderCancelResponse>(
    `/api/stocks/${stockId}/orders/${orderId}`,
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}

export async function cancelAllStockOrders(stockId: number) {
  const { data } = await requests.delete<StockOrderCancelResponse>(
    `/api/stocks/${stockId}/orders`,
  );

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}
