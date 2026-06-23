import {
  getAgentTradeJobState,
  runAgentTradeJob,
} from "@/app/(backend)/lib/agent-trade-runner";

type AgentTradeSchedulerState = {
  intervalMinutes: number;
  startedAt: Date;
  timer: ReturnType<typeof setInterval>;
};

const globalForAgentTradeScheduler = globalThis as unknown as {
  agentTradeSchedulerState?: AgentTradeSchedulerState;
};

function getIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isIntervalFallbackEnabled() {
  return process.env.AGENT_TRADE_INTERVAL_FALLBACK_ENABLED === "true";
}

async function runScheduledAgentTrade() {
  try {
    const job = await runAgentTradeJob({
      includeAdk: true,
      maxExecutableIntents: 5,
      openMarketsOnly: true,
      recordSkippedIntents: false,
      source: "scheduler",
      stockLimit: 30,
    });

    if (job.status === "SKIPPED") {
      console.info("Agent trade scheduler skipped run", {
        currentSource: job.currentSource,
        currentStartedAt: job.currentStartedAt?.toISOString(),
        reason: job.reason,
      });
      return;
    }

    console.info("Agent trade scheduler completed run", job.result);
  } catch (error) {
    console.error("Agent trade scheduler failed run", error);
  }
}

export function startAgentTradeScheduler() {
  if (!isIntervalFallbackEnabled()) {
    console.info("Agent trade interval fallback is disabled; use external scheduler", {
      targetPath: "/api/internal/agents/run-trade?source=scheduler&limit=5&stockLimit=30",
    });
    return;
  }

  if (globalForAgentTradeScheduler.agentTradeSchedulerState) {
    return;
  }

  const intervalMinutes = getIntegerEnv("AGENT_TRADE_INTERVAL_MINUTES", 60);
  const intervalMs = intervalMinutes * 60 * 1000;
  const timer = setInterval(() => {
    void runScheduledAgentTrade();
  }, intervalMs);

  timer.unref?.();

  globalForAgentTradeScheduler.agentTradeSchedulerState = {
    intervalMinutes,
    startedAt: new Date(),
    timer,
  };

  console.info("Agent trade scheduler started", {
    intervalMinutes,
    mode: "interval-fallback",
  });
}

export function getAgentTradeSchedulerStatus() {
  const schedulerState = globalForAgentTradeScheduler.agentTradeSchedulerState;

  return {
    externalScheduler: {
      targetPath: "/api/internal/agents/run-trade?source=scheduler&limit=5&stockLimit=30",
    },
    intervalFallback: {
      enabled: isIntervalFallbackEnabled(),
      intervalMinutes: schedulerState?.intervalMinutes ?? null,
      started: Boolean(schedulerState),
      startedAt: schedulerState?.startedAt ?? null,
    },
    job: getAgentTradeJobState(),
    mode: "external-scheduler",
  };
}
