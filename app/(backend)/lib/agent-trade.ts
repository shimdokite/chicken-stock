import { spawn } from "node:child_process";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import {
  AgentType as PrismaAgentType,
  DecisionStatus,
  StockMarketStatus,
  TradeFrequency,
  TradeOrderType,
  UserType,
} from "@/app/(backend)/generated/prisma/enums";
import type {
  AgentTradeIntent,
  AgentType,
} from "@/app/(backend)/types/agent-trade-intent";
import { prisma } from "@/app/(backend)/lib/prisma";
import {
  getAdkRunWindowStatus,
  getMarketSessionStatus,
} from "@/app/(backend)/lib/market-hours";
import {
  createStockOrderForUser,
  StockOrderServiceError,
} from "@/app/(backend)/lib/stock-order-service";

type TradingAgent = Awaited<ReturnType<typeof getActiveTradingAgents>>[number];
type TradableStock = Awaited<ReturnType<typeof getTradableStocks>>[number];
type RuleBasedDecision = AgentTradeIntent & {
  candidateInput: AdkStockCandidate;
};
type AdkStockCandidate = {
  stockId: number;
  symbol: string;
  name: string;
  price: number;
  per: number | null;
  pbr: number | null;
  epsGrowthRate: number | null;
  revenueGrowthRate: number | null;
  operatingProfitGrowthRate: number | null;
  ma20: number | null;
  ma60: number | null;
  rsi: number | null;
  volumeRatio: number | null;
  priceChangeRate20d: number | null;
  averageVolume20d: number | null;
};
export type AgentTradeRunOptions = {
  includeAdk?: boolean;
  maxExecutableIntents?: number;
  recordSkippedIntents?: boolean;
};
export type AgentTradeRunResult = {
  adkCandidateLimit: number;
  adkEnabled: boolean;
  adkFailedCount: number;
  adkSkippedReason?: "ADK_TIME_WINDOW_CLOSED" | "NO_MARKET_OPEN_CANDIDATES";
  executedCount: number;
  failedCount: number;
  maxExecutableIntents: number;
  rejectedCount: number;
  ruleBasedDecisionCount: number;
  skippedCount: number;
};

const TRADING_AGENT_TYPES = new Set<string>([
  PrismaAgentType.VALUE,
  PrismaAgentType.GROWTH,
  PrismaAgentType.MOMENTUM,
]);
const DEFAULT_ORDER_QUANTITY = getIntegerEnv("AGENT_DEFAULT_ORDER_QUANTITY", 1);
const MAX_ORDER_QUANTITY = getIntegerEnv("AGENT_MAX_ORDER_QUANTITY", 10);
const MAX_DAILY_TRADES = getIntegerEnv("AGENT_MAX_DAILY_TRADES", 20);
const MAX_EXECUTABLE_INTENTS_PER_RUN = getIntegerEnv(
  "AGENT_MAX_EXECUTABLE_INTENTS_PER_RUN",
  MAX_DAILY_TRADES,
);
const EXECUTION_CONCURRENCY = getIntegerEnv("AGENT_TRADE_EXECUTION_CONCURRENCY", 5);
const ADK_WORKER_CONCURRENCY = getIntegerEnv("ADK_WORKER_CONCURRENCY", 5);
const ADK_WORKER_TIMEOUT_MS = getIntegerEnv("ADK_WORKER_TIMEOUT_MS", 90_000);
const ADK_CANDIDATE_LIMIT = clamp(
  getIntegerEnv("ADK_CANDIDATE_LIMIT", 10),
  5,
  15,
);
const ADK_WORKER_PATH = "adk-worker/main.py";

function getIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPositiveInteger(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function toNumber(value: { toString: () => string } | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value.toString());

  return Number.isFinite(parsed) ? parsed : null;
}

function scoreLowerBetter(value: number | null, excellent: number, poor: number) {
  if (value === null || value <= 0) {
    return 0;
  }

  if (value <= excellent) {
    return 100;
  }

  if (value >= poor) {
    return 0;
  }

  return ((poor - value) / (poor - excellent)) * 100;
}

function scoreHigherBetter(value: number | null, poor: number, excellent: number) {
  if (value === null) {
    return 0;
  }

  if (value >= excellent) {
    return 100;
  }

  if (value <= poor) {
    return 0;
  }

  return ((value - poor) / (excellent - poor)) * 100;
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getMovingAverage(candles: TradableStock["candles"], count: number) {
  const closes = candles
    .slice(0, count)
    .map((candle) => toNumber(candle.closePrice))
    .filter((value): value is number => value !== null);

  return average(closes);
}

function getRsi(candles: TradableStock["candles"]) {
  const closes = candles
    .slice(0, 15)
    .map((candle) => toNumber(candle.closePrice))
    .filter((value): value is number => value !== null)
    .reverse();

  if (closes.length < 15) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index < closes.length; index += 1) {
    const change = closes[index] - closes[index - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  if (losses === 0) {
    return 100;
  }

  const rs = gains / losses;

  return 100 - 100 / (1 + rs);
}

function getVolumeRatio(candles: TradableStock["candles"]) {
  const latestVolume = toNumber(candles[0]?.volume);
  const averageVolume = average(
    candles
      .slice(1, 21)
      .map((candle) => toNumber(candle.volume))
      .filter((value): value is number => value !== null),
  );

  if (!latestVolume || !averageVolume || averageVolume <= 0) {
    return null;
  }

  return latestVolume / averageVolume;
}

function getPriceChangeRate(candles: TradableStock["candles"], days: number) {
  const latest = toNumber(candles[0]?.closePrice);
  const previous = toNumber(candles[days]?.closePrice);

  if (!latest || !previous || previous <= 0) {
    return null;
  }

  return ((latest - previous) / previous) * 100;
}

function getGrowthRate(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous <= 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function getLatestAnnualEarnings(stock: TradableStock) {
  return stock.earnings
    .filter((earning) => earning.periodType === "ANNUAL")
    .slice(0, 2);
}

function getStockMetrics(stock: TradableStock): AdkStockCandidate {
  const annualEarnings = getLatestAnnualEarnings(stock);
  const latestRevenue = toNumber(annualEarnings[0]?.estimatedRevenue);
  const previousRevenue = toNumber(annualEarnings[1]?.estimatedRevenue);
  const latestProfit = toNumber(annualEarnings[0]?.estimatedOperatingProfit);
  const previousProfit = toNumber(annualEarnings[1]?.estimatedOperatingProfit);
  const ma20 = getMovingAverage(stock.candles, 20);
  const ma60 = getMovingAverage(stock.candles, 60);

  return {
    averageVolume20d: average(
      stock.candles
        .slice(0, 20)
        .map((candle) => toNumber(candle.volume))
        .filter((value): value is number => value !== null),
    ),
    epsGrowthRate: null,
    ma20,
    ma60,
    name: stock.name,
    operatingProfitGrowthRate: getGrowthRate(latestProfit, previousProfit),
    pbr: stock.financialMetric?.pbr ?? null,
    per: stock.financialMetric?.per ?? toNumber(stock.per),
    price: toNumber(stock.currentPrice) ?? 0,
    priceChangeRate20d: getPriceChangeRate(stock.candles, 20),
    revenueGrowthRate: getGrowthRate(latestRevenue, previousRevenue),
    rsi: getRsi(stock.candles),
    stockId: stock.id,
    symbol: stock.ticker,
    volumeRatio: getVolumeRatio(stock.candles),
  };
}

function getDecisionSide(score: number): AgentTradeIntent["side"] {
  if (score >= 70) {
    return "BUY";
  }

  if (score <= 30) {
    return "SELL";
  }

  return "HOLD";
}

function getAgentType(agentType: PrismaAgentType): AgentType | null {
  return TRADING_AGENT_TYPES.has(agentType) ? (agentType as AgentType) : null;
}

function getFrequencyMultiplier(frequency: TradeFrequency) {
  if (frequency === TradeFrequency.HIGH) {
    return 1;
  }

  if (frequency === TradeFrequency.MEDIUM) {
    return 0.7;
  }

  return 0.4;
}

function getFrequencyDailyLimit(frequency: TradeFrequency) {
  if (frequency === TradeFrequency.HIGH) {
    return MAX_DAILY_TRADES;
  }

  if (frequency === TradeFrequency.MEDIUM) {
    return Math.max(1, Math.floor(MAX_DAILY_TRADES * 0.6));
  }

  return Math.max(1, Math.floor(MAX_DAILY_TRADES * 0.3));
}

function calculateQuantity({
  agent,
  side,
  stock,
}: {
  agent: TradingAgent;
  side: AgentTradeIntent["side"];
  stock: TradableStock;
}) {
  if (side === "HOLD") {
    return 0;
  }

  const currentPrice = toNumber(stock.currentPrice) ?? 0;

  if (currentPrice <= 0) {
    return DEFAULT_ORDER_QUANTITY;
  }

  if (side === "SELL") {
    const holding = agent.user.portfolio?.items.find(
      (item) => item.stockId === stock.id,
    );

    return Math.max(
      1,
      Math.min(holding?.quantity ?? DEFAULT_ORDER_QUANTITY, MAX_ORDER_QUANTITY),
    );
  }

  const portfolio = agent.user.portfolio;

  if (!portfolio) {
    return DEFAULT_ORDER_QUANTITY;
  }

  const cash = toNumber(
    stock.currencyCode === "KRW" ? portfolio.krwBalance : portfolio.usdBalance,
  );
  const totalBalance = toNumber(portfolio.totalBalance) ?? cash ?? 0;
  const reserveRatio = toNumber(agent.cashReserveRatio) ?? 0;
  const riskTolerance = toNumber(agent.riskTolerance) ?? 0.5;
  const maxPositionRatio = toNumber(agent.maxPositionRatio) ?? 0.1;
  const usableCash = Math.max(0, (cash ?? 0) - totalBalance * reserveRatio);
  const riskBudget =
    usableCash * riskTolerance * getFrequencyMultiplier(agent.tradeFrequency);
  const positionBudget = Math.max(0, totalBalance * maxPositionRatio);
  const budget = Math.min(riskBudget, positionBudget);

  return Math.max(
    1,
    Math.min(Math.floor(budget / currentPrice), MAX_ORDER_QUANTITY),
  );
}

function scoreValue(metrics: AdkStockCandidate, stock: TradableStock) {
  const rules = {
    currentRatioScore: scoreHigherBetter(
      stock.financialMetric?.currentRatio ?? toNumber(stock.currentRatio),
      80,
      200,
    ),
    debtRatioScore: scoreLowerBetter(
      stock.financialMetric?.debtRatio ?? toNumber(stock.debtRatio),
      50,
      250,
    ),
    pbrScore: scoreLowerBetter(metrics.pbr, 0.8, 4),
    perScore: scoreLowerBetter(metrics.per, 8, 30),
  };
  const totalScore =
    rules.perScore * 0.35 +
    rules.pbrScore * 0.25 +
    rules.debtRatioScore * 0.25 +
    rules.currentRatioScore * 0.15;

  return { rules, totalScore };
}

function scoreGrowth(metrics: AdkStockCandidate, stock: TradableStock) {
  const estimatedRevenueScore = scoreHigherBetter(
    toNumber(stock.estimatedRevenue),
    0,
    200000000000,
  );
  const rules = {
    epsGrowthScore: scoreHigherBetter(metrics.epsGrowthRate, -10, 30),
    estimatedRevenueScore,
    operatingProfitGrowthScore: scoreHigherBetter(
      metrics.operatingProfitGrowthRate,
      -10,
      40,
    ),
    revenueGrowthScore: scoreHigherBetter(metrics.revenueGrowthRate, -5, 30),
  };
  const totalScore =
    rules.revenueGrowthScore * 0.35 +
    rules.operatingProfitGrowthScore * 0.3 +
    rules.epsGrowthScore * 0.15 +
    rules.estimatedRevenueScore * 0.2;

  return { rules, totalScore };
}

function scoreMomentum(metrics: AdkStockCandidate) {
  const rules = {
    ma20Score:
      metrics.ma20 !== null && metrics.price > metrics.ma20 ? 20 : 0,
    maTrendScore:
      metrics.ma20 !== null && metrics.ma60 !== null && metrics.ma20 > metrics.ma60
        ? 20
        : 0,
    recentReturnScore: scoreHigherBetter(metrics.priceChangeRate20d, -5, 15) * 0.2,
    rsiScore:
      metrics.rsi !== null && metrics.rsi >= 40 && metrics.rsi <= 70 ? 20 : 0,
    volumeScore: scoreHigherBetter(metrics.volumeRatio, 0.8, 1.8) * 0.2,
  };
  const totalScore =
    rules.ma20Score +
    rules.maTrendScore +
    rules.rsiScore +
    rules.volumeScore +
    rules.recentReturnScore;

  return { rules, totalScore };
}

function createRuleBasedDecision(
  agent: TradingAgent,
  stock: TradableStock,
): RuleBasedDecision | null {
  const agentType = getAgentType(agent.agentType);

  if (!agentType) {
    return null;
  }

  const metrics = getStockMetrics(stock);
  const result =
    agentType === "VALUE"
      ? scoreValue(metrics, stock)
      : agentType === "GROWTH"
        ? scoreGrowth(metrics, stock)
        : scoreMomentum(metrics);
  const score = Math.round(result.totalScore * 100) / 100;
  const side = getDecisionSide(score);

  return {
    agentType,
    agentUserId: Number(agent.userId),
    candidateInput: metrics,
    decisionSource: "RULE_BASED",
    quantity: calculateQuantity({ agent, side, stock }),
    rawResponse: {
      rules: result.rules,
      totalScore: score,
    },
    reason: `${agentType} rule score ${score}`,
    score,
    side,
    stockId: stock.id,
  };
}

async function getActiveTradingAgents() {
  return prisma.agent.findMany({
    include: {
      user: {
        include: {
          portfolio: {
            include: {
              items: true,
            },
          },
        },
      },
    },
    where: {
      agentType: {
        in: [
          PrismaAgentType.VALUE,
          PrismaAgentType.GROWTH,
          PrismaAgentType.MOMENTUM,
        ],
      },
      isActive: true,
      user: {
        type: UserType.AGENT,
      },
    },
  });
}

async function getTradableStocks() {
  return prisma.stock.findMany({
    include: {
      candles: {
        orderBy: {
          timestamp: "desc",
        },
        take: 60,
        where: {
          intervalCode: "1D",
        },
      },
      earnings: {
        orderBy: [
          {
            fiscalYear: "desc",
          },
          {
            fiscalQuarter: "desc",
          },
        ],
        take: 6,
      },
      financialMetric: true,
    },
    where: {
      currentPrice: {
        gt: 0,
      },
      marketStatus: StockMarketStatus.LISTED,
    },
  });
}

function sanitizeJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {}));
}

async function createDecisionLog(intent: AgentTradeIntent) {
  return prisma.agentDecisionLog.create({
    data: {
      agentType: intent.agentType,
      agentUserId: BigInt(intent.agentUserId),
      decisionSource: intent.decisionSource,
      quantity: intent.quantity,
      rawResponse: sanitizeJson(intent.rawResponse),
      reason: intent.reason,
      score: new Prisma.Decimal(intent.score ?? 0),
      side: intent.side,
      status: DecisionStatus.PENDING,
      stockId: intent.stockId,
    },
  });
}

function getKstDayStart(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  });
  const [year, month, day] = formatter.format(date).split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day) - 9 * 60 * 60 * 1000);
}

async function validateAgentTradeIntent(intent: AgentTradeIntent) {
  if (intent.side === "HOLD") {
    return null;
  }

  if (intent.side !== "BUY" && intent.side !== "SELL") {
    return "INVALID_ADK_RESPONSE";
  }

  if (!Number.isInteger(intent.quantity) || intent.quantity < 1) {
    return "INVALID_QUANTITY";
  }

  if (intent.quantity > MAX_ORDER_QUANTITY) {
    return "MAX_ORDER_QUANTITY_EXCEEDED";
  }

  const agent = await prisma.agent.findUnique({
    include: {
      user: {
        include: {
          portfolio: {
            include: {
              items: {
                where: {
                  stockId: intent.stockId,
                },
              },
            },
          },
        },
      },
    },
    where: {
      userId: BigInt(intent.agentUserId),
    },
  });

  if (!agent) {
    return "AGENT_NOT_FOUND";
  }

  if (!agent.isActive) {
    return "AGENT_INACTIVE";
  }

  if (agent.user.type !== UserType.AGENT) {
    return "INVALID_AGENT_USER";
  }

  if (!TRADING_AGENT_TYPES.has(agent.agentType) || agent.agentType !== intent.agentType) {
    return "INVALID_AGENT_TYPE";
  }

  const stock = await prisma.stock.findUnique({
    where: {
      id: intent.stockId,
    },
  });

  if (!stock || stock.marketStatus !== StockMarketStatus.LISTED) {
    return "INVALID_STOCK";
  }

  if (intent.decisionSource === "RULE_BASED") {
    const marketSession = await getMarketSessionStatus(stock.countryCode);

    if (marketSession && !marketSession.isOpen) {
      console.info("Rule-based agent trade skipped outside market hours", {
        agentUserId: intent.agentUserId,
        checkedAt: marketSession.checkedAt,
        countryCode: marketSession.countryCode,
        reason: marketSession.reason,
        stockId: intent.stockId,
        timeZone: marketSession.timeZone,
      });

      return "MARKET_CLOSED";
    }
  }

  const portfolio = agent.user.portfolio;

  if (!portfolio) {
    return "PORTFOLIO_NOT_FOUND";
  }

  const todayStart = getKstDayStart();
  const dailyExecutedCount = await prisma.agentDecisionLog.count({
    where: {
      agentUserId: agent.userId,
      createdAt: {
        gte: todayStart,
      },
      status: DecisionStatus.EXECUTED,
    },
  });

  if (dailyExecutedCount >= getFrequencyDailyLimit(agent.tradeFrequency)) {
    return "DAILY_TRADE_LIMIT_EXCEEDED";
  }

  if (intent.side === "SELL") {
    const holding = portfolio.items[0];

    if (!holding || holding.quantity < intent.quantity) {
      return "INSUFFICIENT_POSITION";
    }

    return null;
  }

  const cash =
    stock.currencyCode === "KRW" ? portfolio.krwBalance : portfolio.usdBalance;
  const orderAmount = stock.currentPrice.mul(intent.quantity).toDecimalPlaces(2);
  const cashReserveAmount = portfolio.totalBalance.mul(agent.cashReserveRatio);
  const availableAfterReserve = cash.sub(cashReserveAmount);

  if (orderAmount.gt(cash)) {
    return "INSUFFICIENT_CASH";
  }

  if (orderAmount.gt(availableAfterReserve)) {
    return "CASH_RESERVE_RATIO_VIOLATION";
  }

  const existingPositionAmount =
    portfolio.items[0]?.currentAmount ?? new Prisma.Decimal(0);
  const maxPositionAmount = portfolio.totalBalance.mul(agent.maxPositionRatio);

  if (existingPositionAmount.add(orderAmount).gt(maxPositionAmount)) {
    return "MAX_POSITION_RATIO_EXCEEDED";
  }

  return null;
}

async function getOrderLimitPrice(stockId: number) {
  const stock = await prisma.stock.findUnique({
    select: {
      currentPrice: true,
    },
    where: {
      id: stockId,
    },
  });

  return stock?.currentPrice.toDecimalPlaces(2) ?? null;
}

async function executeIntent(intent: AgentTradeIntent) {
  const log = await createDecisionLog(intent);

  if (intent.side === "HOLD") {
    await prisma.agentDecisionLog.update({
      data: {
        status: DecisionStatus.SKIPPED,
      },
      where: {
        id: log.id,
      },
    });

    return "SKIPPED";
  }

  const rejectReason = await validateAgentTradeIntent(intent);

  if (rejectReason) {
    await prisma.agentDecisionLog.update({
      data: {
        rejectReason,
        status: DecisionStatus.REJECTED,
      },
      where: {
        id: log.id,
      },
    });

    return "REJECTED";
  }

  try {
    const pricePerShare = await getOrderLimitPrice(intent.stockId);

    if (!pricePerShare) {
      await prisma.agentDecisionLog.update({
        data: {
          rejectReason: "INVALID_STOCK",
          status: DecisionStatus.REJECTED,
        },
        where: {
          id: log.id,
        },
      });

      return "REJECTED";
    }

    const order = await createStockOrderForUser({
      orderPriceType: "LIMIT",
      pricePerShare,
      quantity: intent.quantity,
      stockId: intent.stockId,
      type: intent.side === "BUY" ? TradeOrderType.BUY : TradeOrderType.SELL,
      userId: BigInt(intent.agentUserId),
    });

    await prisma.agentDecisionLog.update({
      data: {
        executedOrderId: order.orderId,
        status: DecisionStatus.EXECUTED,
      },
      where: {
        id: log.id,
      },
    });

    return "EXECUTED";
  } catch (error) {
    const rejectReason =
      error instanceof StockOrderServiceError ? error.code : "TRADE_EXECUTION_FAILED";

    await prisma.agentDecisionLog.update({
      data: {
        rejectReason,
        status:
          error instanceof StockOrderServiceError
            ? DecisionStatus.REJECTED
            : DecisionStatus.FAILED,
      },
      where: {
        id: log.id,
      },
    });

    return error instanceof StockOrderServiceError ? "REJECTED" : "FAILED";
  }
}

function selectAdkCandidates(ruleDecisions: RuleBasedDecision[]) {
  const candidatesByAgent = new Map<AgentType, RuleBasedDecision[]>();

  for (const decision of ruleDecisions) {
    const decisions = candidatesByAgent.get(decision.agentType) ?? [];

    decisions.push(decision);
    candidatesByAgent.set(decision.agentType, decisions);
  }

  return new Map(
    Array.from(candidatesByAgent.entries()).map(([agentType, decisions]) => [
      agentType,
      [...decisions]
        .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
        .slice(0, ADK_CANDIDATE_LIMIT),
    ]),
  );
}

async function getMarketOpenRuleDecisions(
  ruleDecisions: RuleBasedDecision[],
  stocks: TradableStock[],
) {
  const marketSessionsByStockId = new Map<number, boolean>();

  for (const stock of stocks) {
    const marketSession = await getMarketSessionStatus(stock.countryCode);

    marketSessionsByStockId.set(stock.id, marketSession?.isOpen === true);
  }

  return ruleDecisions.filter((decision) => {
    return marketSessionsByStockId.get(decision.stockId) === true;
  });
}

async function getAdkRunnableRuleDecisions(
  ruleDecisions: RuleBasedDecision[],
  stocks: TradableStock[],
) {
  const adkRunWindow = getAdkRunWindowStatus();

  if (!adkRunWindow.isOpen) {
    console.info("ADK agent trade skipped outside ADK run window", {
      checkedAt: adkRunWindow.checkedAt,
      reason: adkRunWindow.reason,
      timeZone: adkRunWindow.timeZone,
    });

    return {
      ruleDecisions: [],
      skippedReason: "ADK_TIME_WINDOW_CLOSED" as const,
    };
  }

  const marketOpenRuleDecisions = await getMarketOpenRuleDecisions(
    ruleDecisions,
    stocks,
  );

  if (marketOpenRuleDecisions.length === 0) {
    console.info("ADK agent trade skipped because no candidate market is open", {
      checkedAt: adkRunWindow.checkedAt,
      timeZone: adkRunWindow.timeZone,
    });

    return {
      ruleDecisions: [],
      skippedReason: "NO_MARKET_OPEN_CANDIDATES" as const,
    };
  }

  return {
    ruleDecisions: marketOpenRuleDecisions,
    skippedReason: undefined,
  };
}

function validateAdkIntent(
  value: unknown,
  fallback: RuleBasedDecision,
): AgentTradeIntent | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const side = record.side;
  const quantity = record.quantity;
  const reason = record.reason;

  if (
    record.agentUserId !== fallback.agentUserId ||
    record.agentType !== fallback.agentType ||
    record.decisionSource !== "ADK" ||
    record.stockId !== fallback.stockId ||
    (side !== "BUY" && side !== "SELL" && side !== "HOLD") ||
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    typeof reason !== "string" ||
    reason.trim().length === 0
  ) {
    return null;
  }

  return {
    agentType: fallback.agentType,
    agentUserId: fallback.agentUserId,
    decisionSource: "ADK",
    quantity,
    rawResponse: value,
    reason: reason.trim(),
    score:
      typeof record.score === "number" && Number.isFinite(record.score)
        ? record.score
        : fallback.score,
    side,
    stockId: fallback.stockId,
  };
}

async function runAdkForCandidates(candidates: Map<AgentType, RuleBasedDecision[]>) {
  if (candidates.size === 0) {
    return {
      failedKeys: new Set<string>(),
      intentsByKey: new Map<string, AgentTradeIntent>(),
    };
  }

  const payload = {
    agents: Array.from(candidates.entries()).map(([agentType, decisions]) => ({
      agentType,
      candidates: decisions.map((decision) => ({
        ...decision.candidateInput,
        agentUserId: decision.agentUserId,
        ruleBasedScore: decision.score,
      })),
    })),
  };
  const python = process.env.PYTHON_BIN ?? "python3";

  return new Promise<{
    failedKeys: Set<string>;
    intentsByKey: Map<string, AgentTradeIntent>;
  }>((resolve) => {
    let settled = false;
    const resolveOnce = (result: {
      failedKeys: Set<string>;
      intentsByKey: Map<string, AgentTradeIntent>;
    }) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const child = spawn(python, [
      /* turbopackIgnore: true */ ADK_WORKER_PATH,
      "--stdin",
    ], {
      env: {
        ...process.env,
        ADK_WORKER_CONCURRENCY: String(ADK_WORKER_CONCURRENCY),
        GEMINI_MODEL:
          process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
        MAX_CANDIDATES_PER_RUN: String(ADK_CANDIDATE_LIMIT),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    const timeout = setTimeout(() => {
      console.error(
        `ADK worker timed out after ${ADK_WORKER_TIMEOUT_MS}ms`,
        stderr,
      );
      child.kill("SIGTERM");
      resolveOnce({ failedKeys: getCandidateKeys(candidates), intentsByKey: new Map() });
    }, ADK_WORKER_TIMEOUT_MS);
    child.on("error", () => {
      resolveOnce({ failedKeys: getCandidateKeys(candidates), intentsByKey: new Map() });
    });
    child.on("close", (code) => {
      if (code !== 0) {
        console.error("ADK worker failed", stderr);
        resolveOnce({ failedKeys: getCandidateKeys(candidates), intentsByKey: new Map() });
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as unknown[];
        const intentsByKey = new Map<string, AgentTradeIntent>();
        const failedKeys = new Set<string>();

        for (const [agentType, decisions] of candidates) {
          for (const decision of decisions) {
            const rawIntent = parsed.find(
              (item) =>
                typeof item === "object" &&
                item !== null &&
                (item as Record<string, unknown>).agentType === agentType &&
                (item as Record<string, unknown>).stockId === decision.stockId,
            );
            const intent = validateAdkIntent(rawIntent, decision);
            const key = getDecisionKey(decision);

            if (intent) {
              intentsByKey.set(key, intent);
            } else {
              failedKeys.add(key);
            }
          }
        }

        resolveOnce({ failedKeys, intentsByKey });
      } catch (error) {
        console.error("ADK worker response parse failed", error, stdout);
        resolveOnce({ failedKeys: getCandidateKeys(candidates), intentsByKey: new Map() });
      }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}

function getDecisionKey(decision: Pick<AgentTradeIntent, "agentType" | "stockId">) {
  return `${decision.agentType}:${decision.stockId}`;
}

function getCandidateKeys(candidates: Map<AgentType, RuleBasedDecision[]>) {
  return new Set(
    Array.from(candidates.values())
      .flat()
      .map((decision) => getDecisionKey(decision)),
  );
}

async function recordAdkFailures(
  failures: Set<string>,
  ruleDecisions: RuleBasedDecision[],
) {
  for (const decision of ruleDecisions) {
    if (!failures.has(getDecisionKey(decision))) {
      continue;
    }

    const log = await createDecisionLog({
      ...decision,
      decisionSource: "ADK",
      rawResponse: {
        fallback: "RULE_BASED",
        reason: "ADK_CALL_FAILED_OR_INVALID_RESPONSE",
        ruleBasedRawResponse: decision.rawResponse,
      },
      reason: "ADK 실패로 Rule-based 판단을 fallback으로 사용",
    });

    await prisma.agentDecisionLog.update({
      data: {
        rejectReason: "ADK_CALL_FAILED",
        status: DecisionStatus.FAILED,
      },
      where: {
        id: log.id,
      },
    });
  }
}

function capExecutableIntents(
  intents: AgentTradeIntent[],
  maxExecutableIntents = MAX_EXECUTABLE_INTENTS_PER_RUN,
) {
  const executableKeys = new Set(
    intents
      .filter((intent) => intent.side !== "HOLD")
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .slice(0, maxExecutableIntents)
      .map((intent) => getDecisionKey(intent)),
  );

  return intents.map((intent) => {
    if (intent.side === "HOLD" || executableKeys.has(getDecisionKey(intent))) {
      return intent;
    }

    return {
      ...intent,
      quantity: 0,
      rawResponse: {
        cappedByRunLimit: true,
        originalRawResponse: intent.rawResponse,
        originalSide: intent.side,
      },
      reason: `${intent.reason}; run execution cap으로 주문 생략`,
      side: "HOLD" as const,
    };
  });
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );

  return results;
}

export async function runAgentTrade(options: AgentTradeRunOptions = {}) {
  const includeAdk = options.includeAdk ?? true;
  const maxExecutableIntents = getPositiveInteger(
    options.maxExecutableIntents,
    MAX_EXECUTABLE_INTENTS_PER_RUN,
  );
  const recordSkippedIntents = options.recordSkippedIntents ?? true;
  const startedAt = Date.now();
  let lastMark = startedAt;
  const markDuration = (step: string, extra?: Record<string, unknown>) => {
    const now = Date.now();

    console.info("Agent trade step completed", {
      ...extra,
      elapsedMs: now - startedAt,
      step,
      stepMs: now - lastMark,
    });
    lastMark = now;
  };
  const [agents, stocks] = await Promise.all([
    getActiveTradingAgents(),
    getTradableStocks(),
  ]);

  markDuration("load-inputs", {
    agentCount: agents.length,
    stockCount: stocks.length,
  });

  const ruleDecisions = agents.flatMap((agent) =>
    stocks
      .map((stock) => createRuleBasedDecision(agent, stock))
      .filter((decision): decision is RuleBasedDecision => decision !== null),
  );

  markDuration("create-rule-decisions", {
    ruleBasedDecisionCount: ruleDecisions.length,
  });

  const adkRunnableRuleDecisions = includeAdk
    ? await getAdkRunnableRuleDecisions(ruleDecisions, stocks)
    : { ruleDecisions: [], skippedReason: undefined };

  markDuration("filter-adk-candidates", {
    adkRunnableDecisionCount: adkRunnableRuleDecisions.ruleDecisions.length,
    adkSkippedReason: adkRunnableRuleDecisions.skippedReason,
  });

  const adkCandidates = includeAdk
    ? selectAdkCandidates(adkRunnableRuleDecisions.ruleDecisions)
    : new Map();
  const shouldRunAdk = includeAdk && adkCandidates.size > 0;
  const { failedKeys, intentsByKey } = shouldRunAdk
    ? await runAdkForCandidates(adkCandidates)
    : { failedKeys: new Set<string>(), intentsByKey: new Map<string, AgentTradeIntent>() };
  const adkCandidateKeys = getCandidateKeys(adkCandidates);

  markDuration("run-adk", {
    adkCandidateGroupCount: adkCandidates.size,
    adkFailedCount: failedKeys.size,
    adkIntentCount: intentsByKey.size,
    shouldRunAdk,
  });

  if (shouldRunAdk) {
    await recordAdkFailures(failedKeys, ruleDecisions);
  }

  const mergedIntents = capExecutableIntents(ruleDecisions.map((decision) => {
    const key = getDecisionKey(decision);

    if (adkCandidateKeys.has(key) && intentsByKey.has(key)) {
      return intentsByKey.get(key) ?? decision;
    }

    return decision;
  }), maxExecutableIntents);
  const executableIntents = mergedIntents.filter((intent) => intent.side !== "HOLD");
  const intentsToExecute = recordSkippedIntents ? mergedIntents : executableIntents;
  const result: AgentTradeRunResult = {
    adkCandidateLimit: ADK_CANDIDATE_LIMIT,
    adkEnabled: shouldRunAdk,
    adkFailedCount: failedKeys.size,
    adkSkippedReason: adkRunnableRuleDecisions.skippedReason,
    executedCount: 0,
    failedCount: 0,
    maxExecutableIntents,
    rejectedCount: 0,
    ruleBasedDecisionCount: ruleDecisions.length,
    skippedCount: mergedIntents.length - intentsToExecute.length,
  };

  markDuration("prepare-execution", {
    executableIntentCount: executableIntents.length,
    intentExecutionCount: intentsToExecute.length,
    recordSkippedIntents,
  });

  const statuses = await mapWithConcurrency(
    intentsToExecute,
    EXECUTION_CONCURRENCY,
    executeIntent,
  );

  for (const status of statuses) {
    if (status === "EXECUTED") {
      result.executedCount += 1;
    } else if (status === "REJECTED") {
      result.rejectedCount += 1;
    } else if (status === "FAILED") {
      result.failedCount += 1;
    } else if (status === "SKIPPED") {
      result.skippedCount += 1;
    }
  }

  markDuration("execute-intents", result);

  return result;
}
