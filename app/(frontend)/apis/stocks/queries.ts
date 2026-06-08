import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  fetchStockCandles,
  fetchStockOrderBook,
  fetchStockOrders,
  fetchStocks,
} from "./api";
import type { StockCandleInterval } from "./api";
import type { StockOrderBookSnapshotData } from "../../types/stock/stock-detail";

export const stockQueryKeys = {
  lists: () => ["stocks"] as const,
  list: (market: string, ranking: string) =>
    [...stockQueryKeys.lists(), market, ranking] as const,
  candles: (stockId: number, interval: StockCandleInterval) =>
    ["stock-candles", stockId, interval] as const,
  orderBook: (stockId: number) => ["stock-order-book", stockId] as const,
  orders: (stockId: number) => ["stock-orders", stockId] as const,
};

const STOCK_CANDLES_REFETCH_INTERVAL_MS = 10_000;
const STOCK_ORDER_BOOK_REFETCH_INTERVAL_MS = 5_000;
const STOCK_ORDERS_REFETCH_INTERVAL_MS = 10_000;

export function useStocksInfiniteQuery(market: string, ranking: string) {
  return useInfiniteQuery({
    queryKey: stockQueryKeys.list(market, ranking),
    queryFn: ({ pageParam }) => fetchStocks(market, ranking, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });
}

export function useStockCandlesQuery(
  stockId: number,
  interval: StockCandleInterval,
) {
  return useQuery({
    queryKey: stockQueryKeys.candles(stockId, interval),
    queryFn: () => fetchStockCandles(stockId, interval),
    enabled: Number.isInteger(stockId) && stockId > 0,
    refetchInterval: STOCK_CANDLES_REFETCH_INTERVAL_MS,
  });
}

export function useStockOrderBookQuery(
  stockId: number,
  initialData?: StockOrderBookSnapshotData | null,
) {
  return useQuery({
    queryKey: stockQueryKeys.orderBook(stockId),
    queryFn: () => fetchStockOrderBook(stockId),
    enabled: Number.isInteger(stockId) && stockId > 0,
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
