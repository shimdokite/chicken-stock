import { requests } from "../request";
import type { StockData } from "../../components/main/stock_list/types";

export const STOCKS_PAGE_SIZE = 10;

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

export async function fetchStocks(
  market: string,
  ranking: string,
  page: number,
) {
  const { data } = await requests.get<StocksResponse>("/api/stocks", {
    params: {
      market,
      ranking,
      page,
      limit: STOCKS_PAGE_SIZE,
    },
  });

  if (!data.ok) {
    throw new Error(data.error);
  }

  return data.data;
}
