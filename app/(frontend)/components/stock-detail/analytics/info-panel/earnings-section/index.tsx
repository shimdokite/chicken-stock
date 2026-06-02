"use client";

import { useMemo, useState } from "react";
import EarningsChart from "../earnings-chart";
import MetricCard from "../metric-card";
import {
  formatCompactMoney,
  getEarningChartData,
  getLatestEarning,
  periodLabels,
} from "../helpers";
import type { EarningPeriodTab } from "../types";
import type { StockOnlyProps } from "../../../../../types/stock/stock-detail";

const periodTabs: EarningPeriodTab[] = ["ANNUAL", "QUARTER"];

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

export default function EarningsSection({ stock }: StockOnlyProps) {
  const [periodType, setPeriodType] = useState<EarningPeriodTab>("ANNUAL");
  const latestEarning = getLatestEarning(stock);
  const chartData = useMemo(
    () => getEarningChartData(stock.earnings, periodType),
    [periodType, stock.earnings],
  );

  return (
    <section>
      <h3 className="mb-5 text-2xl font-semibold tracking-normal">실적</h3>
      <div className="mb-14 grid grid-cols-3 gap-4">
        <MetricCard
          label="발표 날짜"
          value={formatDate(latestEarning?.announcementDate)}
        />
        <MetricCard
          label="예상 영업이익"
          value={formatCompactMoney(
            latestEarning?.estimatedOperatingProfit,
            stock.currencyCode,
          )}
        />
        <MetricCard
          label="예상 매출"
          value={formatCompactMoney(
            latestEarning?.estimatedRevenue,
            stock.currencyCode,
          )}
        />
      </div>

      <h4 className="mb-3 text-2xl font-semibold tracking-normal">예상 매출</h4>
      <div className="mb-3 flex gap-5 text-xs">
        {periodTabs.map((tab) => (
          <button
            key={tab}
            className={`px-0 py-1 ${periodType === tab ? "font-bold" : ""}`}
            type="button"
            onClick={() => setPeriodType(tab)}
          >
            {periodLabels[tab]}
          </button>
        ))}
      </div>

      <EarningsChart data={chartData} currencyCode={stock.currencyCode} />
    </section>
  );
}
