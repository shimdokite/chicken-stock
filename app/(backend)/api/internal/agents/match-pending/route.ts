import { after, NextRequest, NextResponse } from "next/server";
import { matchPendingStockOrders } from "@/app/(backend)/lib/stock-order-service";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const tokens = [
    process.env.AGENT_INTERNAL_TOKEN,
    process.env.CRON_SECRET,
  ].filter((token): token is string => Boolean(token));

  if (tokens.length === 0) {
    return true;
  }

  const authorization = request.headers.get("authorization");

  return tokens.some((token) => authorization === `Bearer ${token}`);
}

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function handleMatchPendingRequest(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        ok: false,
      },
      { status: 401 },
    );
  }

  const options = {
    limit: parsePositiveInteger(request.nextUrl.searchParams.get("limit")) ?? 10,
    stockId: parsePositiveInteger(request.nextUrl.searchParams.get("stockId")),
  };
  const source = request.nextUrl.searchParams.get("source");

  if (source === "scheduler") {
    after(async () => {
      try {
        const result = await matchPendingStockOrders(options);

        console.info("Scheduled pending order matching finished", result);
      } catch (error) {
        console.error("Scheduled pending order matching failed", error);
      }
    });

    return NextResponse.json(
      {
        data: {
          accepted: true,
          limit: options.limit,
          source,
          stockId: options.stockId ?? null,
        },
        ok: true,
      },
      { status: 202 },
    );
  }

  try {
    const result = await matchPendingStockOrders(options);

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

export async function GET(request: NextRequest) {
  return handleMatchPendingRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMatchPendingRequest(request);
}
