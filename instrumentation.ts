export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { startAgentTradeScheduler } = await import(
    "@/app/(backend)/lib/agent-trade-scheduler"
  );

  startAgentTradeScheduler();
}
