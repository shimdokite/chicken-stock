import type { StockData } from "../../components/main/stock_list/types";

type StocksResponse =
  | {
      ok: true;
      data: StockData[];
    }
  | {
      ok: false;
      error: string;
    };

export async function fetchStocks(market: string, ranking: string) {
  const url = new URL("/api/stocks", window.location.origin);
  url.searchParams.set("market", market);
  url.searchParams.set("ranking", ranking);

  const response = await fetch(url, { cache: "no-store" });
  const result = (await response.json()) as StocksResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.ok ? "STOCKS_FETCH_FAILED" : result.error);
  }

  return result.data;
}
