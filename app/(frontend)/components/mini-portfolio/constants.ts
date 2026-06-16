import type { PortfolioAssetType } from "@/app/(frontend)/apis/portfolio/api";

export const ASSET_LABELS: Record<PortfolioAssetType, string> = {
  DOMESTIC_STOCK: "국내주식",
  FOREIGN_STOCK: "해외주식",
};

export const ASSET_ORDER: PortfolioAssetType[] = [
  "FOREIGN_STOCK",
  "DOMESTIC_STOCK",
];

export const SORT_OPTIONS = [
  { label: "총 수익률 높은 순", value: "profitRateDesc" },
  { label: "총 수익률 낮은 순", value: "profitRateAsc" },
  { label: "가나다 순", value: "nameAsc" },
] as const;
