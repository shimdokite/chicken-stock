import "server-only";

import { prisma } from "./prisma";

export type MarketSessionCountryCode = "KR" | "US";

type ZonedDateTimeParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  weekday: string;
  year: number;
};

type MarketSessionStatus = {
  checkedAt: string;
  countryCode: MarketSessionCountryCode;
  isOpen: boolean;
  reason:
    | "MARKET_OPEN"
    | "MARKET_SESSION_OVERRIDE"
    | "WEEKEND"
    | "MARKET_HOLIDAY"
    | "OUTSIDE_REGULAR_HOURS";
  timeZone: string;
};

type AdkRunWindowStatus = {
  checkedAt: string;
  isOpen: boolean;
  reason: "ADK_WINDOW_OPEN" | "ADK_WINDOW_OVERRIDE" | "OUTSIDE_ADK_WINDOW";
  timeZone: "Asia/Seoul";
};

const ADK_RUN_WINDOW = {
  closeHour: 12,
  closeMinute: 0,
  openHour: 10,
  openMinute: 0,
  timeZone: "Asia/Seoul" as const,
};

const MARKET_SESSIONS: Record<
  MarketSessionCountryCode,
  {
    closeHour: number;
    closeMinute: number;
    openHour: number;
    openMinute: number;
    timeZone: string;
  }
> = {
  KR: {
    closeHour: 15,
    closeMinute: 30,
    openHour: 9,
    openMinute: 0,
    timeZone: "Asia/Seoul",
  },
  US: {
    closeHour: 16,
    closeMinute: 0,
    openHour: 9,
    openMinute: 30,
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

function toMinutes(hour: number, minute: number) {
  return hour * 60 + minute;
}

function isWeekend(weekday: string) {
  return weekday === "Sat" || weekday === "Sun";
}

function getCheckedDateKey(
  parts: Pick<ZonedDateTimeParts, "day" | "month" | "year">,
) {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function parseTimeToMinutes(value: string | null) {
  if (!value) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  return toMinutes(Number(match[1]), Number(match[2]));
}

function toMarketDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function isAdkRunWindowOverridden(date: Date) {
  const overrideUntil = process.env.ADK_RUN_WINDOW_OVERRIDE_UNTIL;

  if (!overrideUntil) {
    return false;
  }

  const expiresAt = new Date(overrideUntil);

  return Number.isFinite(expiresAt.getTime()) && date < expiresAt;
}

function isMarketSessionOverridden(date: Date) {
  const overrideUntil = process.env.MARKET_SESSION_OVERRIDE_UNTIL;

  if (!overrideUntil) {
    return false;
  }

  const expiresAt = new Date(overrideUntil);

  return Number.isFinite(expiresAt.getTime()) && date < expiresAt;
}

export function getAdkRunWindowStatus(date = new Date()): AdkRunWindowStatus {
  const parts = getZonedDateTimeParts(date, ADK_RUN_WINDOW.timeZone);
  const checkedAt = getCheckedDateKey(parts);

  if (isAdkRunWindowOverridden(date)) {
    return {
      checkedAt,
      isOpen: true,
      reason: "ADK_WINDOW_OVERRIDE",
      timeZone: ADK_RUN_WINDOW.timeZone,
    };
  }

  const currentMinutes = toMinutes(parts.hour, parts.minute);
  const openMinutes = toMinutes(
    ADK_RUN_WINDOW.openHour,
    ADK_RUN_WINDOW.openMinute,
  );
  const closeMinutes = toMinutes(
    ADK_RUN_WINDOW.closeHour,
    ADK_RUN_WINDOW.closeMinute,
  );
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  return {
    checkedAt,
    isOpen,
    reason: isOpen ? "ADK_WINDOW_OPEN" : "OUTSIDE_ADK_WINDOW",
    timeZone: ADK_RUN_WINDOW.timeZone,
  };
}

export async function isMarketSessionOpenWakeupWindow(
  countryCode: string,
  date = new Date(),
  windowMinutes = 5,
) {
  if (countryCode !== "KR" && countryCode !== "US") {
    return false;
  }

  const session = MARKET_SESSIONS[countryCode];
  const parts = getZonedDateTimeParts(date, session.timeZone);
  const currentMinutes = toMinutes(parts.hour, parts.minute);
  const openMinutes = toMinutes(session.openHour, session.openMinute);
  const normalizedWindowMinutes = Math.min(
    Math.max(Math.floor(windowMinutes), 1),
    60,
  );
  const isInOpenWindow =
    currentMinutes >= openMinutes &&
    currentMinutes < openMinutes + normalizedWindowMinutes;

  if (!isInOpenWindow) {
    return false;
  }

  return (await getMarketSessionStatus(countryCode, date))?.isOpen === true;
}

export async function getMarketSessionStatus(
  countryCode: string,
  date = new Date(),
): Promise<MarketSessionStatus | null> {
  if (countryCode !== "KR" && countryCode !== "US") {
    return null;
  }

  const session = MARKET_SESSIONS[countryCode];
  const parts = getZonedDateTimeParts(date, session.timeZone);
  const checkedAt = getCheckedDateKey(parts);

  if (isMarketSessionOverridden(date)) {
    return {
      checkedAt,
      countryCode,
      isOpen: true,
      reason: "MARKET_SESSION_OVERRIDE",
      timeZone: session.timeZone,
    };
  }

  if (isWeekend(parts.weekday)) {
    return {
      checkedAt,
      countryCode,
      isOpen: false,
      reason: "WEEKEND",
      timeZone: session.timeZone,
    };
  }

  const marketHoliday = await prisma.marketHoliday.findUnique({
    where: {
      countryCode_marketDate: {
        countryCode,
        marketDate: toMarketDate(checkedAt),
      },
    },
  });

  if (marketHoliday?.isClosed) {
    return {
      checkedAt,
      countryCode,
      isOpen: false,
      reason: "MARKET_HOLIDAY",
      timeZone: session.timeZone,
    };
  }

  const currentMinutes = toMinutes(parts.hour, parts.minute);
  const openMinutes =
    parseTimeToMinutes(marketHoliday?.openTime ?? null) ??
    toMinutes(session.openHour, session.openMinute);
  const closeMinutes =
    parseTimeToMinutes(marketHoliday?.closeTime ?? null) ??
    toMinutes(session.closeHour, session.closeMinute);
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  return {
    checkedAt,
    countryCode,
    isOpen,
    reason: isOpen ? "MARKET_OPEN" : "OUTSIDE_REGULAR_HOURS",
    timeZone: session.timeZone,
  };
}
