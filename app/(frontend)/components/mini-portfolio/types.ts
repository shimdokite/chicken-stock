import type { PortfolioAssetType } from "@/app/(frontend)/apis/portfolio/api";
import type { CurrencyCode } from "@/app/(frontend)/utils/currency";
import type { SORT_OPTIONS } from "./constants";

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
export type AmountView = "currentPrice" | "evaluationAmount";
export type CollapsedAssetSections = Record<PortfolioAssetType, boolean>;
export type ForeignStockCurrency = Extract<CurrencyCode, "KRW" | "USD">;
