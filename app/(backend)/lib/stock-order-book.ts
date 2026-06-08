import type {
  StockOrderBookRecentOrderData,
  StockOrderBookSnapshotData,
} from "@/app/(frontend)/types/stock/stock-detail";
import {
  TradeOrderStatus,
  TradeOrderType,
} from "@/app/(backend)/generated/prisma/enums";
import { Prisma } from "@/app/(backend)/generated/prisma/client";
import { prisma } from "./prisma";

type DecimalLike = {
  toNumber: () => number;
  toString: () => string;
};

type OrderBookSnapshotSource = {
  timestamp: bigint;
  totalAskSize: DecimalLike;
  totalBidSize: DecimalLike;
  volume: DecimalLike;
  buyVolume: DecimalLike;
  sellVolume: DecimalLike;
  executionStrength: DecimalLike;
  lastTradeVolume: DecimalLike;
  levels: {
    side: "ASK" | "BID";
    levelRank: number;
    price: DecimalLike;
    quantity: DecimalLike;
  }[];
};

type OrderBookMarketSource = {
  currentPrice: DecimalLike;
  previousClose: DecimalLike;
  changeRate: DecimalLike;
  dayHigh: DecimalLike;
  dayLow: DecimalLike;
  volume: DecimalLike;
};

type RecentTradeExecutionSource = {
  id: string;
  aggressorSide: TradeOrderType;
  quantity: number;
  price: DecimalLike;
  executedAt: Date;
};

type OrderBookActivity = {
  buyVolume: number;
  executionStrength: number;
  hasExecutionActivity: boolean;
  levelsByKey: Map<
    string,
    {
      orderCount: number;
      pendingQuantity: number;
      price: number;
      side: "ASK" | "BID";
    }
  >;
  lastTradeVolume: number;
  recentOrders: StockOrderBookRecentOrderData[];
  sellVolume: number;
  totalPendingAskSize: number;
  totalPendingBidSize: number;
  volume: number;
};

const EMPTY_ORDER_BOOK_ACTIVITY: OrderBookActivity = {
  buyVolume: 0,
  executionStrength: 0,
  hasExecutionActivity: false,
  levelsByKey: new Map(),
  lastTradeVolume: 0,
  recentOrders: [],
  sellVolume: 0,
  totalPendingAskSize: 0,
  totalPendingBidSize: 0,
  volume: 0,
};
const ZERO_DECIMAL = new Prisma.Decimal(0);

function toNumber(value: DecimalLike) {
  return value.toNumber();
}

function getOrderBookSide(type: TradeOrderType): "ASK" | "BID" {
  return type === TradeOrderType.SELL ? "ASK" : "BID";
}

function getOrderCountKey(side: "ASK" | "BID", price: DecimalLike) {
  return `${side}:${price.toString()}`;
}

function serializeDate(value: Date) {
  return value.toISOString();
}

export function hasOrderBookActivity(activity: OrderBookActivity) {
  return (
    activity.levelsByKey.size > 0 ||
    activity.recentOrders.length > 0 ||
    activity.totalPendingAskSize > 0 ||
    activity.totalPendingBidSize > 0 ||
    activity.volume > 0
  );
}

export function serializeOrderBookActivitySnapshot(
  activity: OrderBookActivity,
  market?: OrderBookMarketSource,
): StockOrderBookSnapshotData {
  return serializeOrderBookSnapshot(
    {
      timestamp: BigInt(Date.now()),
      totalAskSize: ZERO_DECIMAL,
      totalBidSize: ZERO_DECIMAL,
      volume: ZERO_DECIMAL,
      buyVolume: ZERO_DECIMAL,
      sellVolume: ZERO_DECIMAL,
      executionStrength: ZERO_DECIMAL,
      lastTradeVolume: ZERO_DECIMAL,
      levels: [],
    },
    activity,
    market,
  );
}

function serializeRecentExecution(
  execution: RecentTradeExecutionSource,
): StockOrderBookRecentOrderData {
  return {
    id: execution.id,
    orderedAt: serializeDate(execution.executedAt),
    price: toNumber(execution.price),
    quantity: execution.quantity,
    side: execution.aggressorSide,
    status: TradeOrderStatus.COMPLETED,
  };
}

function getExecutionStrength(buyVolume: number, sellVolume: number) {
  if (buyVolume <= 0 && sellVolume <= 0) {
    return 0;
  }

  if (sellVolume <= 0) {
    return 100;
  }

  return (buyVolume / sellVolume) * 100;
}

function getKstCandleWindow(timestamp: bigint) {
  const start = new Date(Number(timestamp) - 9 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { end, start };
}

function getRankedLevels(activity: OrderBookActivity) {
  const levels = [...activity.levelsByKey.values()].map((levelActivity) => ({
    side: levelActivity.side,
    levelRank: Number.MAX_SAFE_INTEGER,
    orderCount: levelActivity.orderCount,
    price: levelActivity.price,
    quantity: levelActivity.pendingQuantity,
  }));
  const asks = levels
    .filter((level) => level.side === "ASK")
    .sort((a, b) => a.price - b.price)
    .map((level, index) => ({
      ...level,
      levelRank: index + 1,
    }));
  const bids = levels
    .filter((level) => level.side === "BID")
    .sort((a, b) => b.price - a.price)
    .map((level, index) => ({
      ...level,
      levelRank: index + 1,
    }));

  return [...asks, ...bids];
}

export function serializeOrderBookSnapshot(
  snapshot: OrderBookSnapshotSource,
  activity: OrderBookActivity = EMPTY_ORDER_BOOK_ACTIVITY,
  market?: OrderBookMarketSource,
): StockOrderBookSnapshotData {
  const levels = getRankedLevels(activity);
  const totalAskSize = levels
    .filter((level) => level.side === "ASK")
    .reduce((sum, level) => sum + level.quantity, 0);
  const totalBidSize = levels
    .filter((level) => level.side === "BID")
    .reduce((sum, level) => sum + level.quantity, 0);

  return {
    timestamp: Number(snapshot.timestamp),
    currentPrice: market ? toNumber(market.currentPrice) : undefined,
    previousClose: market ? toNumber(market.previousClose) : undefined,
    changeRate: market ? toNumber(market.changeRate) : undefined,
    dayHigh: market ? toNumber(market.dayHigh) : undefined,
    dayLow: market ? toNumber(market.dayLow) : undefined,
    volumeAmount: market ? toNumber(market.volume) : undefined,
    totalAskSize,
    totalBidSize,
    volume: activity.hasExecutionActivity
      ? activity.volume
      : toNumber(snapshot.volume),
    buyVolume: activity.hasExecutionActivity
      ? activity.buyVolume
      : toNumber(snapshot.buyVolume),
    sellVolume: activity.hasExecutionActivity
      ? activity.sellVolume
      : toNumber(snapshot.sellVolume),
    executionStrength: activity.hasExecutionActivity
      ? activity.executionStrength
      : toNumber(snapshot.executionStrength),
    lastTradeVolume: activity.hasExecutionActivity
      ? activity.lastTradeVolume
      : toNumber(snapshot.lastTradeVolume),
    levels,
    recentOrders: activity.recentOrders,
  };
}

export async function getOrderBookActivity(
  stockId: number,
): Promise<OrderBookActivity> {
  const stock = await prisma.stock.findUnique({
    select: {
      candles: {
        orderBy: {
          timestamp: "desc",
        },
        select: {
          timestamp: true,
        },
        take: 1,
        where: {
          intervalCode: "1D",
        },
      },
    },
    where: {
      id: stockId,
    },
  });
  const latestDailyCandle = stock?.candles[0] ?? null;
  const executionWindow = latestDailyCandle
    ? getKstCandleWindow(latestDailyCandle.timestamp)
    : null;
  const executionWhere = {
    ...(executionWindow
      ? {
          executedAt: {
            gte: executionWindow.start,
            lt: executionWindow.end,
          },
        }
      : {}),
    buyOrderId: {
      not: null,
    },
    sellOrderId: {
      not: null,
    },
    stockId,
  };
  const [pendingOrderGroups, recentExecutions, executionVolumeGroups] =
    await Promise.all([
      prisma.tradeOrder.groupBy({
        by: ["type", "pricePerShare"],
        _count: {
          orderId: true,
        },
        _sum: {
          remainingQuantity: true,
        },
        where: {
          remainingQuantity: {
            gt: 0,
          },
          status: TradeOrderStatus.PENDING,
          stockId,
        },
      }),
      prisma.tradeExecution.findMany({
        orderBy: {
          executedAt: "desc",
        },
        take: 8,
        where: executionWhere,
      }),
      prisma.tradeExecution.groupBy({
        by: ["aggressorSide"],
        _sum: {
          quantity: true,
        },
        where: executionWhere,
      }),
    ]);
  const levelsByKey = new Map<
    string,
    {
      orderCount: number;
      pendingQuantity: number;
      price: number;
      side: "ASK" | "BID";
    }
  >();
  let totalPendingAskSize = 0;
  let totalPendingBidSize = 0;
  let buyVolume = 0;
  let sellVolume = 0;

  for (const group of pendingOrderGroups) {
    const side = getOrderBookSide(group.type);
    const pendingQuantity = group._sum.remainingQuantity ?? 0;

    if (side === "ASK") {
      totalPendingAskSize += pendingQuantity;
    } else {
      totalPendingBidSize += pendingQuantity;
    }

    levelsByKey.set(getOrderCountKey(side, group.pricePerShare), {
      orderCount: group._count.orderId,
      pendingQuantity,
      price: toNumber(group.pricePerShare),
      side,
    });
  }

  for (const group of executionVolumeGroups) {
    const quantity = group._sum.quantity ?? 0;

    if (group.aggressorSide === TradeOrderType.BUY) {
      buyVolume += quantity;
    } else {
      sellVolume += quantity;
    }
  }

  const lastTradeVolume = recentExecutions[0]?.quantity ?? 0;
  const volume = buyVolume + sellVolume;

  return {
    buyVolume,
    executionStrength: getExecutionStrength(buyVolume, sellVolume),
    hasExecutionActivity: volume > 0,
    levelsByKey,
    lastTradeVolume,
    recentOrders: recentExecutions.map(serializeRecentExecution),
    sellVolume,
    totalPendingAskSize,
    totalPendingBidSize,
    volume,
  };
}

export async function getLatestOrderBookSnapshot(stockId: number) {
  const stock = await prisma.stock.findUnique({
    where: {
      id: stockId,
    },
    select: {
      currentPrice: true,
      previousClose: true,
      changeRate: true,
      dayHigh: true,
      dayLow: true,
      volume: true,
      orderBookSnapshots: {
        orderBy: {
          timestamp: "desc",
        },
        take: 1,
        include: {
          levels: {
            orderBy: [
              {
                side: "asc",
              },
              {
                levelRank: "asc",
              },
            ],
          },
        },
      },
    },
  });

  if (!stock) {
    return {
      stockExists: false,
      orderBookSnapshot: null,
    };
  }

  const [orderBookSnapshot] = stock.orderBookSnapshots;
  const activity = await getOrderBookActivity(stockId);

  return {
    stockExists: true,
    orderBookSnapshot: orderBookSnapshot
      ? serializeOrderBookSnapshot(orderBookSnapshot, activity, stock)
      : hasOrderBookActivity(activity)
        ? serializeOrderBookActivitySnapshot(activity, stock)
      : null,
  };
}
