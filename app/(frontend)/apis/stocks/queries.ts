import { useQuery } from "@tanstack/react-query";
import { fetchStocks } from "./api";

export const stockQueryKeys = {
  lists: () => ["stocks"] as const,
  list: (market: string, ranking: string) =>
    [...stockQueryKeys.lists(), market, ranking] as const,
};

export function useStocksQuery(market: string, ranking: string) {
  return useQuery({
    queryKey: stockQueryKeys.list(market, ranking),
    queryFn: () => fetchStocks(market, ranking),
  });
}
