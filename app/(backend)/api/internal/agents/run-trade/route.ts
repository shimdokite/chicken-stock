import { NextRequest, NextResponse } from "next/server";
import { runAgentTradeJob } from "@/app/(backend)/lib/agent-trade-runner";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const token = process.env.AGENT_INTERNAL_TOKEN;

  if (!token) {
    return true;
  }

  return request.headers.get("authorization") === `Bearer ${token}`;
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
    const job = await runAgentTradeJob({
      includeAdk: request.nextUrl.searchParams.get("adk") !== "false",
      source: "manual",
    });

    if (job.status === "SKIPPED") {
      return NextResponse.json({
        data: job,
        ok: true,
      });
    }

    return NextResponse.json({
      data: job.result,
      ok: true,
    });
  } catch (error) {
    console.error("Agent trade run failed", error);

    return NextResponse.json(
      {
        error: "Agent trade run failed",
        ok: false,
      },
      { status: 500 },
    );
  }
}
