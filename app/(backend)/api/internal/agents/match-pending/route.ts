import { NextRequest, NextResponse } from "next/server";
import { matchPendingStockOrders } from "@/app/(backend)/lib/stock-order-service";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const token = process.env.AGENT_INTERNAL_TOKEN;

  if (!token) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${token}`;
}

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        ok: false,
      },
      { status: 401 },
    );
  }

  try {
    const result = await matchPendingStockOrders({
      limit: parsePositiveInteger(request.nextUrl.searchParams.get("limit")) ?? 100,
      stockId: parsePositiveInteger(request.nextUrl.searchParams.get("stockId")),
    });

    return NextResponse.json({
      data: result,
      ok: true,
    });
  } catch (error) {
    console.error("Pending order matching API failed", error);

    return NextResponse.json(
      {
        error: "Pending order matching failed",
        ok: false,
      },
      { status: 500 },
    );
  }
}
