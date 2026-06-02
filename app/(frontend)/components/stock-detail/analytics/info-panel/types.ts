import type {
  StockFinancialPeriodType,
  StockFinancialStatementType,
} from "../../../../types/stock/stock-detail";

export type InfoSection = "financial" | "earnings" | "valuation";

export type FinancialStatementTab = StockFinancialStatementType;

export type EarningPeriodTab = StockFinancialPeriodType;

export type ValuationMetricTab = "PER" | "PBR";

export type FinancialTableRow = {
  item: string;
  values: Record<string, string>;
};

export type ChartDatum = {
  label: string;
  revenue?: number;
  operatingProfit?: number;
  stockValue?: number;
  industryValue?: number;
};
