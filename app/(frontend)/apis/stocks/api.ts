import { requests } from "../request";
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
  const { data } = await requests.get<StocksResponse>("/api/stocks", {
    params: {
      market,
      ranking,
    },
  });

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}
