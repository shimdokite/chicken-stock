import { NextRequest, NextResponse } from "next/server";
import { runAgentTradeJob } from "@/app/(backend)/lib/agent-trade-runner";

export const runtime = "nodejs";

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

function getJobSource(request: NextRequest) {
  return request.nextUrl.searchParams.get("source") === "scheduler"
    ? "scheduler"
    : "manual";
}

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

async function handleRunTradeRequest(
  request: NextRequest,
  source: "manual" | "scheduler",
) {
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
      maxExecutableIntents:
        parsePositiveInteger(request.nextUrl.searchParams.get("limit")) ??
        (source === "scheduler" ? 5 : undefined),
      recordSkippedIntents: source !== "scheduler",
      source,
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

export async function GET(request: NextRequest) {
  return handleRunTradeRequest(request, "scheduler");
}

export async function POST(request: NextRequest) {
  return handleRunTradeRequest(request, getJobSource(request));
}
