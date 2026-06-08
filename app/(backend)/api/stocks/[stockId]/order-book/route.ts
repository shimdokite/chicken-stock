import { NextResponse } from "next/server";
import { getLatestOrderBookSnapshot } from "@/app/(backend)/lib/stock-order-book";

type StockOrderBookRouteProps = {
  params: Promise<{
    stockId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: StockOrderBookRouteProps,
) {
  try {
    const { stockId } = await params;
    const parsedStockId = Number(stockId);

    if (!Number.isInteger(parsedStockId) || parsedStockId <= 0) {
      return NextResponse.json(
        { ok: false, error: "INVALID_STOCK_ID" },
        { status: 400 },
      );
    }

    const { stockExists, orderBookSnapshot } =
      await getLatestOrderBookSnapshot(parsedStockId);

    if (!stockExists) {
      return NextResponse.json(
        { ok: false, error: "STOCK_NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        orderBookSnapshot,
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "STOCK_ORDER_BOOK_FETCH_FAILED"
        : error instanceof Error
          ? error.message
          : "STOCK_ORDER_BOOK_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
