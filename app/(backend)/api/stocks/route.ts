import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_STOCKS_PAGE,
  STOCKS_PAGE_SIZE,
  getStocksPage,
  parsePositiveInteger,
  parseStockMarketFilter,
  parseStockRanking,
} from "../../lib/stocks";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const market = parseStockMarketFilter(searchParams.get("market"));
    const ranking = parseStockRanking(searchParams.get("ranking"));
    const page = parsePositiveInteger(
      searchParams.get("page"),
      DEFAULT_STOCKS_PAGE,
    );
    const limit = Math.min(
      parsePositiveInteger(searchParams.get("limit"), STOCKS_PAGE_SIZE),
      STOCKS_PAGE_SIZE,
    );
    const stocksPage = await getStocksPage({ limit, market, page, ranking });

    return NextResponse.json({
      ok: true,
      data: stocksPage,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "STOCKS_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "STOCKS_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
