import type {
  AgentTradeRunOptions,
  AgentTradeRunResult,
} from "@/app/(backend)/lib/agent-trade";

type AgentTradeJobSource = "manual" | "scheduler";

type AgentTradeJobState = {
  currentSource?: AgentTradeJobSource;
  currentStartedAt?: Date;
  isRunning: boolean;
  lastError?: string;
  lastFinishedAt?: Date;
  lastResult?: AgentTradeRunResult;
  lastSource?: AgentTradeJobSource;
  lastStartedAt?: Date;
  runCount: number;
  skipCount: number;
};

type AgentTradeJobCompleted = {
  result: AgentTradeRunResult;
  status: "COMPLETED";
};

type AgentTradeJobSkipped = {
  currentSource?: AgentTradeJobSource;
  currentStartedAt?: Date;
  reason: "AGENT_TRADE_JOB_ALREADY_RUNNING";
  status: "SKIPPED";
};

export type AgentTradeJobResult = AgentTradeJobCompleted | AgentTradeJobSkipped;

const globalForAgentTradeJob = globalThis as unknown as {
  agentTradeJobState?: AgentTradeJobState;
};

function getState() {
  globalForAgentTradeJob.agentTradeJobState ??= {
    isRunning: false,
    runCount: 0,
    skipCount: 0,
  };

  return globalForAgentTradeJob.agentTradeJobState;
}

function serializeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function getAgentTradeJobState() {
  const state = getState();

  return {
    currentSource: state.currentSource,
    currentStartedAt: state.currentStartedAt,
    isRunning: state.isRunning,
    lastError: state.lastError,
    lastFinishedAt: state.lastFinishedAt,
    lastResult: state.lastResult,
    lastSource: state.lastSource,
    lastStartedAt: state.lastStartedAt,
    runCount: state.runCount,
    skipCount: state.skipCount,
  };
}

export async function runAgentTradeJob(
  options: AgentTradeRunOptions & { source: AgentTradeJobSource },
): Promise<AgentTradeJobResult> {
  const state = getState();

  if (state.isRunning) {
    state.skipCount += 1;

    return {
      currentSource: state.currentSource,
      currentStartedAt: state.currentStartedAt,
      reason: "AGENT_TRADE_JOB_ALREADY_RUNNING",
      status: "SKIPPED",
    };
  }

  const startedAt = new Date();

  state.currentSource = options.source;
  state.currentStartedAt = startedAt;
  state.isRunning = true;
  state.lastError = undefined;
  state.lastSource = options.source;
  state.lastStartedAt = startedAt;

  try {
    const { runAgentTrade } = await import("@/app/(backend)/lib/agent-trade");
    const result = await runAgentTrade({
      includeAdk: options.includeAdk,
      maxExecutableIntents: options.maxExecutableIntents,
      openMarketsOnly: options.openMarketsOnly,
      recordSkippedIntents: options.recordSkippedIntents,
      stockLimit: options.stockLimit,
    });

    state.lastResult = result;
    state.runCount += 1;

    return {
      result,
      status: "COMPLETED",
    };
  } catch (error) {
    state.lastError = serializeError(error);
    throw error;
  } finally {
    state.currentSource = undefined;
    state.currentStartedAt = undefined;
    state.isRunning = false;
    state.lastFinishedAt = new Date();
  }
}
