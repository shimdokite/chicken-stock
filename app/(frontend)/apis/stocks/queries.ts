import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchStockAnalytics,
  fetchStockCandles,
  fetchStockOrderBook,
  fetchStockOrders,
  fetchStockSearchResults,
  fetchStocks,
} from "./api";
import type { StockCandleInterval, StocksPage } from "./api";
import type { ChartCandleData } from "../../components/stock-detail/order/chart-panel/types";
import type {
  StockAnalyticsData,
  StockOrderBookSnapshotData,
} from "../../types/stock/stock-detail";

export const stockQueryKeys = {
  lists: () => ["stocks"] as const,
  list: (market: string, ranking: string) =>
    [...stockQueryKeys.lists(), market, ranking] as const,
  analytics: (stockId: number) => ["stock-analytics", stockId] as const,
  search: (query: string) =>
    [...stockQueryKeys.lists(), "search", query] as const,
  candles: (stockId: number, interval: StockCandleInterval) =>
    ["stock-candles", stockId, interval] as const,
  orderBook: (stockId: number) => ["stock-order-book", stockId] as const,
  orders: (stockId: number) => ["stock-orders", stockId] as const,
};

const STOCK_CANDLES_REFETCH_INTERVAL_MS = 10_000;
const STOCK_ORDER_BOOK_REFETCH_INTERVAL_MS = 5_000;
const STOCK_ORDERS_REFETCH_INTERVAL_MS = 10_000;

export function useStocksInfiniteQuery(
  market: string,
  ranking: string,
  initialData?: StocksPage,
) {
  return useInfiniteQuery({
    queryKey: stockQueryKeys.list(market, ranking),
    queryFn: ({ pageParam }) => fetchStocks(market, ranking, pageParam),
    initialPageParam: 1,
    initialData: initialData
      ? {
          pageParams: [1],
          pages: [initialData],
        }
      : undefined,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 10_000,
  });
}

export function useStockSearchQuery(query: string, enabled = true) {
  const trimmedQuery = query.trim();

  return useQuery({
    queryKey: stockQueryKeys.search(trimmedQuery),
    queryFn: () => fetchStockSearchResults(trimmedQuery),
    enabled: enabled && trimmedQuery.length > 0,
    staleTime: 60_000,
  });
}

export function useStockCandlesQuery(
  stockId: number,
  interval: StockCandleInterval,
  placeholderData?: ChartCandleData[],
) {
  return useQuery({
    queryKey: stockQueryKeys.candles(stockId, interval),
    queryFn: () => fetchStockCandles(stockId, interval),
    enabled: Number.isInteger(stockId) && stockId > 0,
    placeholderData,
    refetchInterval: STOCK_CANDLES_REFETCH_INTERVAL_MS,
  });
}

export function useStockAnalyticsQuery(
  stockId: number,
  initialData?: StockAnalyticsData,
) {
  return useQuery({
    queryKey: stockQueryKeys.analytics(stockId),
    queryFn: () => fetchStockAnalytics(stockId),
    enabled: Number.isInteger(stockId) && stockId > 0,
    initialData,
    staleTime: 60_000,
  });
}

export function useStockOrderBookQuery(
  stockId: number,
  initialData?: StockOrderBookSnapshotData | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: stockQueryKeys.orderBook(stockId),
    queryFn: () => fetchStockOrderBook(stockId),
    enabled: enabled && Number.isInteger(stockId) && stockId > 0,
    initialData,
    refetchInterval: STOCK_ORDER_BOOK_REFETCH_INTERVAL_MS,
    staleTime: 5_000,
  });
}

export function useStockOrdersQuery(stockId: number) {
  return useQuery({
    queryKey: stockQueryKeys.orders(stockId),
    queryFn: () => fetchStockOrders(stockId),
    enabled: Number.isInteger(stockId) && stockId > 0,
    refetchInterval: STOCK_ORDERS_REFETCH_INTERVAL_MS,
  });
}
