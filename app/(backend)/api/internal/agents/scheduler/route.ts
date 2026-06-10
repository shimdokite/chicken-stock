import { NextRequest, NextResponse } from "next/server";
import { getAgentTradeSchedulerStatus } from "@/app/(backend)/lib/agent-trade-scheduler";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const token = process.env.AGENT_INTERNAL_TOKEN;

  if (!token) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${token}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        ok: false,
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    data: getAgentTradeSchedulerStatus(),
    ok: true,
  });
}
