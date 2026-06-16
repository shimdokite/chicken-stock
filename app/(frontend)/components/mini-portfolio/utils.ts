import type {
  PortfolioAssetType,
  PortfolioItem,
} from "@/app/(frontend)/apis/portfolio/api";
import type { CurrencyCode } from "@/app/(frontend)/utils/currency";
import { SORT_OPTIONS } from "./constants";
import type { SortOption } from "./types";

export function getSortOptionLabel(value: SortOption) {
  return SORT_OPTIONS.find((option) => option.value === value)?.label ?? "";
}

export function formatWon(value: number | string) {
  return `${Number(value).toLocaleString("ko-KR", {
    maximumFractionDigits: 0,
  })}원`;
}

export function formatDollar(value: number | string) {
  const amount = Number(value);
  let sign = "";

  if (amount < 0) {
    sign = "-";
  }

  return `${sign}$${Math.abs(amount).toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}`;
}

export function formatCurrencyAmount(
  value: number,
  currencyCode: CurrencyCode,
) {
  if (currencyCode === "USD") {
    return formatDollar(value);
  }

  return formatWon(value);
}

export function formatProfit(
  value: number,
  rate: number,
  currencyCode: CurrencyCode,
) {
  let sign = "";

  if (value > 0) {
    sign = "+";
  }

  return `${sign}${formatCurrencyAmount(value, currencyCode)}(${rate.toFixed(
    2,
  )}%)`;
}

export function getProfitClassName(value: number) {
  if (value > 0) {
    return "text-[#ff0000]";
  }

  if (value < 0) {
    return "text-[#0066ff]";
  }

  return "text-[#555555]";
}

export function getPortfolioItemsByAsset(
  items: PortfolioItem[],
  assetType: PortfolioAssetType,
  sortOption: SortOption,
) {
  return items
    .filter((item) => item.assetType === assetType)
    .sort((prev, next) => {
      if (sortOption === "nameAsc") {
        return prev.companyName.localeCompare(next.companyName, "ko-KR");
      }

      const prevProfitRate = Number(prev.profitRate);
      const nextProfitRate = Number(next.profitRate);

      if (sortOption === "profitRateAsc") {
        return prevProfitRate - nextProfitRate;
      }

      return nextProfitRate - prevProfitRate;
    });
}
