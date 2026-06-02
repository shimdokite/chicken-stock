import type {
  StockCurrencyCode,
  StockDetailData,
  StockEarningData,
  StockFinancialStatementData,
} from "../../../../types/stock/stock-detail";
import type {
  ChartDatum,
  EarningPeriodTab,
  FinancialStatementTab,
  FinancialTableRow,
  ValuationMetricTab,
} from "./types";

const statementRows: Record<
  FinancialStatementTab,
  { key: string; label: string; type?: "money" | "percent" | "multiple" }[]
> = {
  INCOME_STATEMENT: [
    { key: "revenue", label: "매출액", type: "money" },
    { key: "operatingProfit", label: "영업이익", type: "money" },
    { key: "netIncome", label: "당기순이익", type: "money" },
    { key: "eps", label: "EPS", type: "money" },
    { key: "operatingMargin", label: "영업이익률", type: "percent" },
    { key: "netMargin", label: "순이익률", type: "percent" },
  ],
  BALANCE_SHEET: [
    { key: "assets", label: "자산총계", type: "money" },
    { key: "liabilities", label: "부채총계", type: "money" },
    { key: "equity", label: "자본총계", type: "money" },
    { key: "currentAssets", label: "유동자산", type: "money" },
    { key: "currentLiabilities", label: "유동부채", type: "money" },
    { key: "debtRatio", label: "부채비율", type: "percent" },
    { key: "currentRatio", label: "유동비율", type: "percent" },
    { key: "pbr", label: "PBR", type: "multiple" },
  ],
  CASH_FLOW: [
    { key: "operatingCashFlow", label: "영업활동현금흐름", type: "money" },
    { key: "capitalExpenditure", label: "투자지출", type: "money" },
    { key: "freeCashFlow", label: "잉여현금흐름", type: "money" },
    { key: "interestCoverageRatio", label: "이자보상비율", type: "multiple" },
  ],
};

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatStatementValue(
  value: unknown,
  currencyCode: StockCurrencyCode,
  type?: "money" | "percent" | "multiple",
) {
  const numberValue = getNumber(value);

  if (numberValue === null) {
    return "-";
  }

  if (type === "money") {
    return formatCompactMoney(numberValue, currencyCode);
  }

  if (type === "percent") {
    return formatMetricValue(numberValue);
  }

  if (type === "multiple") {
    return formatMultiple(numberValue);
  }

  return numberValue.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  });
}

export const sectionLabels = {
  financial: "재무",
  earnings: "실적",
  valuation: "가치평가",
} as const;

export const statementLabels: Record<FinancialStatementTab, string> = {
  INCOME_STATEMENT: "손익계산서",
  BALANCE_SHEET: "재무상태표",
  CASH_FLOW: "현금흐름표",
};

export const periodLabels: Record<EarningPeriodTab, string> = {
  ANNUAL: "연간",
  QUARTER: "분기",
};

export const valuationLabels: Record<ValuationMetricTab, string> = {
  PER: "PER",
  PBR: "PBR",
};

export function formatCompactMoney(
  value: number | null | undefined,
  currencyCode: StockCurrencyCode = "KRW",
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  if (currencyCode === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }

  const absValue = Math.abs(value);

  if (absValue >= 1_0000_0000_0000) {
    const jo = Math.trunc(value / 1_0000_0000_0000);
    const eok = Math.round((value % 1_0000_0000_0000) / 100_000_000);

    return eok > 0 ? `${jo}조 ${eok.toLocaleString("ko-KR")}억원` : `${jo}조원`;
  }

  if (absValue >= 100_000_000) {
    return `${Math.round(value / 100_000_000).toLocaleString("ko-KR")}억`;
  }

  return value.toLocaleString("ko-KR");
}

export function formatMetricValue(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}%`;
}

export function formatMultiple(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
  })}배`;
}

export function getPeriodLabel(
  statement: Pick<
    StockFinancialStatementData | StockEarningData,
    "periodType" | "fiscalYear" | "fiscalQuarter"
  >,
) {
  if (statement.periodType === "QUARTER" && statement.fiscalQuarter) {
    return `${String(statement.fiscalYear).slice(2)}년 ${statement.fiscalQuarter}Q`;
  }

  return `${statement.fiscalYear}`;
}

export function getFinancialTableRows(
  statements: StockFinancialStatementData[],
  statementType: FinancialStatementTab,
  currencyCode: StockCurrencyCode,
): { columns: string[]; rows: FinancialTableRow[] } {
  const scopedStatements = statements
    .filter((statement) => statement.statementType === statementType)
    .sort((a, b) => {
      if (a.periodType !== b.periodType) {
        return a.periodType === "ANNUAL" ? -1 : 1;
      }

      if (a.fiscalYear !== b.fiscalYear) {
        return a.fiscalYear - b.fiscalYear;
      }

      return (a.fiscalQuarter ?? 0) - (b.fiscalQuarter ?? 0);
    })
    .slice(-4);

  const columns = scopedStatements.map(getPeriodLabel);
  const rows = statementRows[statementType].map((row) => ({
    item: row.label,
    values: Object.fromEntries(
      scopedStatements.map((statement) => [
        getPeriodLabel(statement),
        formatStatementValue(statement.data[row.key], currencyCode, row.type),
      ]),
    ),
  }));

  return { columns, rows };
}

export function getLatestEarning(stock: StockDetailData) {
  return [...stock.earnings].sort((a, b) => {
    if (a.periodType !== b.periodType) {
      return a.periodType === "ANNUAL" ? -1 : 1;
    }

    if (a.fiscalYear !== b.fiscalYear) {
      return b.fiscalYear - a.fiscalYear;
    }

    return (b.fiscalQuarter ?? 0) - (a.fiscalQuarter ?? 0);
  })[0];
}

export function getEarningChartData(
  earnings: StockEarningData[],
  periodType: EarningPeriodTab,
): ChartDatum[] {
  return earnings
    .filter((earning) => earning.periodType === periodType)
    .sort((a, b) => {
      if (a.fiscalYear !== b.fiscalYear) {
        return a.fiscalYear - b.fiscalYear;
      }

      return (a.fiscalQuarter ?? 0) - (b.fiscalQuarter ?? 0);
    })
    .slice(-6)
    .map((earning) => ({
      label: getPeriodLabel(earning),
      revenue: earning.estimatedRevenue ?? 0,
      operatingProfit: earning.estimatedOperatingProfit ?? 0,
    }));
}

export function getValuationChartData(
  stock: StockDetailData,
  metric: ValuationMetricTab,
): ChartDatum[] {
  const currentPer = stock.financialMetric?.per ?? stock.per;
  const currentPbr = stock.financialMetric?.pbr ?? null;
  const industryPer = stock.themeFinancialMetric.per;
  const industryPbr = stock.themeFinancialMetric.pbr;
  const stockValue = metric === "PER" ? currentPer : currentPbr;
  const industryValue = metric === "PER" ? industryPer : industryPbr;
  const stockForwardFactor = metric === "PER" ? 0.86 : 0.9;
  const industryForwardFactor = metric === "PER" ? 0.9 : 0.94;

  const toMultiple = (value: number | null | undefined, factor = 1) =>
    value === null || value === undefined
      ? undefined
      : Number((value * factor).toFixed(2));

  return [
    {
      label: "최근 1년",
      stockValue: toMultiple(stockValue),
      industryValue: toMultiple(industryValue),
    },
    {
      label: "2027(예상)",
      stockValue: toMultiple(stockValue, stockForwardFactor),
      industryValue: toMultiple(industryValue, industryForwardFactor),
    },
  ];
}
