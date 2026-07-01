const DAILY_CANDLE_INTERVAL_CODE = "1D";
const MIN_PRICE = 0.01;

type MarketCountryCode = "KR" | "US";

type MarketConfig = {
  closeHour: number;
  closeMinute: number;
  timeZone: string;
};

type ZonedDateTimeParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  weekday: string;
  year: number;
};

type ExistingDailyCandle = {
  closePrice: number;
  highPrice: number;
  intervalCode: string;
  lowPrice: number;
  openPrice: number;
  timestamp: bigint;
  volume: number;
};

type MissingDailyCandle = ExistingDailyCandle & {
  ticker: string;
};

type BuildMissingDailyCandlesParams = {
  completedDateKeys: string[];
  existingCandles: ExistingDailyCandle[];
  fallbackPrice: number;
  ticker: string;
};

type GetCompletedMarketDateKeysParams = {
  closedDateKeys?: Iterable<string>;
  countryCode: MarketCountryCode;
  lookbackDays: number;
  now?: Date;
};

type EnsureListedDailyCandlesOptions = {
  countryCode?: MarketCountryCode;
  lookbackDays?: number;
  now?: Date;
};

const MARKET_CONFIGS: Record<MarketCountryCode, MarketConfig> = {
  KR: {
    closeHour: 15,
    closeMinute: 30,
    timeZone: "Asia/Seoul",
  },
  US: {
    closeHour: 16,
    closeMinute: 0,
    timeZone: "America/New_York",
  },
};

function getZonedDateTimeParts(
  date: Date,
  timeZone: string,
): ZonedDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    weekday: "short",
    year: "numeric",
  }).formatToParts(date);
  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    day: Number(getPart("day")),
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
    month: Number(getPart("month")),
    weekday: getPart("weekday"),
    year: Number(getPart("year")),
  };
}

function getDateKey(parts: Pick<ZonedDateTimeParts, "day" | "month" | "year">) {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function getDateKeyTimestamp(dateKey: string) {
  return BigInt(new Date(`${dateKey}T00:00:00.000Z`).getTime());
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function isWeekend(dateKey: string) {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();

  return day === 0 || day === 6;
}

function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function toFinitePrice(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof value.toNumber === "function"
  ) {
    return value.toNumber();
  }

  return Number(value);
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function getDeterministicUnit(seed: string, salt: string) {
  return hashString(`${seed}:${salt}`) / 0xffffffff;
}

function getDeterministicRate(seed: string, salt: string, maxAbsRate: number) {
  return (getDeterministicUnit(seed, salt) * 2 - 1) * maxAbsRate;
}

function roundPrice(value: number) {
  return Math.max(MIN_PRICE, Math.round(value * 100) / 100);
}

function getPriceTick(price: number) {
  return price >= 1000 ? 1 : MIN_PRICE;
}

function isInactiveFlatCandle(candle: ExistingDailyCandle) {
  return (
    candle.volume === 0 &&
    candle.openPrice === candle.highPrice &&
    candle.highPrice === candle.lowPrice &&
    candle.lowPrice === candle.closePrice
  );
}

function buildMarketLikeDailyCandle({
  dateKey,
  previousClose,
  ticker,
}: {
  dateKey: string;
  previousClose: number;
  ticker: string;
}): MissingDailyCandle {
  const seed = `${ticker}:${dateKey}`;
  const openPrice = roundPrice(
    previousClose * (1 + getDeterministicRate(seed, "open", 0.008)),
  );
  let closePrice = roundPrice(
    openPrice * (1 + getDeterministicRate(seed, "close", 0.026)),
  );

  if (closePrice === openPrice) {
    const direction = getDeterministicUnit(seed, "direction") >= 0.5 ? 1 : -1;

    closePrice = roundPrice(openPrice + getPriceTick(openPrice) * direction);
  }

  const highExtraRate = 0.003 + getDeterministicUnit(seed, "high") * 0.018;
  const lowExtraRate = 0.003 + getDeterministicUnit(seed, "low") * 0.018;
  const highPrice = roundPrice(Math.max(openPrice, closePrice) * (1 + highExtraRate));
  const lowPrice = roundPrice(
    Math.min(openPrice, closePrice) * (1 - lowExtraRate),
  );
  const volume = 1_000 + Math.floor(getDeterministicUnit(seed, "volume") * 49_000);

  return {
    closePrice,
    highPrice: Math.max(highPrice, openPrice, closePrice),
    intervalCode: DAILY_CANDLE_INTERVAL_CODE,
    lowPrice: Math.max(MIN_PRICE, Math.min(lowPrice, openPrice, closePrice)),
    openPrice,
    ticker,
    timestamp: getDateKeyTimestamp(dateKey),
    volume,
  };
}

function toMarketCountryCode(countryCode: string): MarketCountryCode {
  return countryCode === "US" ? "US" : "KR";
}

function isCurrentMarketDateCompleted(
  now: Date,
  config: MarketConfig,
  currentMarketDateKey: string,
  dateKey: string,
) {
  if (dateKey !== currentMarketDateKey) {
    return true;
  }

  const parts = getZonedDateTimeParts(now, config.timeZone);

  return (
    toMinutes(parts.hour, parts.minute) >=
    toMinutes(config.closeHour, config.closeMinute)
  );
}

export function getMarketDateTimestamp(
  date: Date,
  countryCode: MarketCountryCode,
) {
  const config = MARKET_CONFIGS[countryCode];
  const parts = getZonedDateTimeParts(date, config.timeZone);

  return BigInt(Date.UTC(parts.year, parts.month - 1, parts.day));
}

export function getCompletedMarketDateKeys({
  closedDateKeys = [],
  countryCode,
  lookbackDays,
  now = new Date(),
}: GetCompletedMarketDateKeysParams) {
  const config = MARKET_CONFIGS[countryCode];
  const closedDates = new Set(closedDateKeys);
  const currentMarketDateKey = getDateKey(
    getZonedDateTimeParts(now, config.timeZone),
  );
  const completedDateKeys: string[] = [];
  let dateKey = currentMarketDateKey;

  while (completedDateKeys.length < lookbackDays) {
    if (
      !isWeekend(dateKey) &&
      !closedDates.has(dateKey) &&
      isCurrentMarketDateCompleted(now, config, currentMarketDateKey, dateKey)
    ) {
      completedDateKeys.push(dateKey);
    }

    dateKey = addDays(dateKey, -1);
  }

  return completedDateKeys.reverse();
}

export function buildMissingDailyCandles({
  completedDateKeys,
  existingCandles,
  fallbackPrice,
  ticker,
}: BuildMissingDailyCandlesParams): MissingDailyCandle[] {
  const candlesByTimestamp = new Map(
    existingCandles.map((candle) => [candle.timestamp.toString(), candle]),
  );
  const sortedCandles = [...existingCandles].sort((left, right) =>
    left.timestamp < right.timestamp ? -1 : left.timestamp > right.timestamp ? 1 : 0,
  );
  const missingCandles: MissingDailyCandle[] = [];

  completedDateKeys.forEach((dateKey) => {
    const timestamp = getDateKeyTimestamp(dateKey);
    const existingCandle = candlesByTimestamp.get(timestamp.toString());

    if (existingCandle && !isInactiveFlatCandle(existingCandle)) {
      return;
    }

    const previousCandle = [...sortedCandles]
      .reverse()
      .find((candle) => candle.timestamp < timestamp);
    const closePrice = previousCandle?.closePrice ?? fallbackPrice;

    if (!Number.isFinite(closePrice) || closePrice <= 0) {
      return;
    }

    const candle = buildMarketLikeDailyCandle({
      dateKey,
      previousClose: closePrice,
      ticker,
    });

    missingCandles.push(candle);
    const existingIndex = sortedCandles.findIndex(
      (sortedCandle) => sortedCandle.timestamp === timestamp,
    );

    if (existingIndex >= 0) {
      sortedCandles[existingIndex] = candle;
    } else {
      sortedCandles.push(candle);
    }

    sortedCandles.sort((left, right) =>
      left.timestamp < right.timestamp
        ? -1
        : left.timestamp > right.timestamp
          ? 1
          : 0,
    );
    candlesByTimestamp.set(timestamp.toString(), candle);
  });

  return missingCandles;
}

export async function ensureListedDailyCandles({
  countryCode,
  lookbackDays = 7,
  now = new Date(),
}: EnsureListedDailyCandlesOptions = {}) {
  const [{ prisma }] = await Promise.all([import("./prisma")]);
  const countryCodes = countryCode ? [countryCode] : (["KR", "US"] as const);
  const sinceDate = new Date(now);

  sinceDate.setUTCDate(sinceDate.getUTCDate() - Math.max(lookbackDays * 2, 14));

  const holidays = await prisma.marketHoliday.findMany({
    select: {
      countryCode: true,
      isClosed: true,
      marketDate: true,
    },
    where: {
      countryCode: {
        in: [...countryCodes],
      },
      isClosed: true,
      marketDate: {
        gte: new Date(
          Date.UTC(
            sinceDate.getUTCFullYear(),
            sinceDate.getUTCMonth(),
            sinceDate.getUTCDate(),
          ),
        ),
      },
    },
  });

  const closedDateKeysByCountry = new Map<MarketCountryCode, Set<string>>();
  countryCodes.forEach((code) => {
    closedDateKeysByCountry.set(code, new Set());
  });
  holidays.forEach((holiday) => {
    const holidayCountryCode = toMarketCountryCode(holiday.countryCode);

    closedDateKeysByCountry
      .get(holidayCountryCode)
      ?.add(holiday.marketDate.toISOString().slice(0, 10));
  });

  const completedDateKeysByCountry = new Map(
    countryCodes.map((code) => [
      code,
      getCompletedMarketDateKeys({
        closedDateKeys: closedDateKeysByCountry.get(code),
        countryCode: code,
        lookbackDays,
        now,
      }),
    ]),
  );

  const stocks = await prisma.stock.findMany({
    select: {
      candles: {
        orderBy: {
          timestamp: "desc",
        },
        select: {
          closePrice: true,
          highPrice: true,
          intervalCode: true,
          lowPrice: true,
          openPrice: true,
          timestamp: true,
          volume: true,
        },
        take: lookbackDays + 30,
        where: {
          intervalCode: DAILY_CANDLE_INTERVAL_CODE,
        },
      },
      countryCode: true,
      currentPrice: true,
      previousClose: true,
      ticker: true,
    },
    where: {
      countryCode: {
        in: [...countryCodes],
      },
      marketStatus: "LISTED",
    },
  });

  const missingCandles = stocks.flatMap((stock) =>
    buildMissingDailyCandles({
      completedDateKeys:
        completedDateKeysByCountry.get(toMarketCountryCode(stock.countryCode)) ??
        [],
      existingCandles: stock.candles.map((candle) => ({
        closePrice: toFinitePrice(candle.closePrice),
        highPrice: toFinitePrice(candle.highPrice),
        intervalCode: candle.intervalCode,
        lowPrice: toFinitePrice(candle.lowPrice),
        openPrice: toFinitePrice(candle.openPrice),
        timestamp: candle.timestamp,
        volume: toFinitePrice(candle.volume),
      })),
      fallbackPrice:
        toFinitePrice(stock.previousClose) || toFinitePrice(stock.currentPrice),
      ticker: stock.ticker,
    }),
  );

  if (missingCandles.length === 0) {
    return {
      created: 0,
      lookbackDays,
      stocks: stocks.length,
    };
  }

  const result = await prisma.$transaction(
    missingCandles.map((candle) =>
      prisma.stockCandle.upsert({
        create: candle,
        update: {
          closePrice: candle.closePrice,
          highPrice: candle.highPrice,
          lowPrice: candle.lowPrice,
          openPrice: candle.openPrice,
          volume: candle.volume,
        },
        where: {
          ticker_intervalCode_timestamp: {
            intervalCode: candle.intervalCode,
            ticker: candle.ticker,
            timestamp: candle.timestamp,
          },
        },
      }),
    ),
  );

  return {
    created: result.length,
    lookbackDays,
    stocks: stocks.length,
    upserted: result.length,
  };
}
