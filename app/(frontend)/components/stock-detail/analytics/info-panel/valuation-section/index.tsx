"use client";

import { useMemo, useState } from "react";
import ValuationChart from "../valuation-chart";
import { getValuationChartData, valuationLabels } from "../helpers";
import type { ValuationMetricTab } from "../types";
import type { StockOnlyProps } from "../../../../../types/stock/stock-detail";

const metricTabs: ValuationMetricTab[] = ["PER"];
const themeLabels: Record<string, string> = {
  AI: "인공지능",
  SEMICONDUCTOR: "반도체",
  CLOUD: "클라우드",
  PHARMACEUTICAL: "제약",
  MEDICAL_DEVICE: "의료기기",
  HEALTHCARE_SERVICE: "헬스케어 서비스",
  BANKING: "은행",
  SECURITIES: "증권",
  PAYMENT: "결제",
  E_COMMERCE: "전자상거래",
  FOOD_BEVERAGE: "식음료",
  CONTENT: "콘텐츠",
  BIO: "바이오",
  BANK: "은행",
};

export default function ValuationSection({ stock }: StockOnlyProps) {
  const [metric, setMetric] = useState<ValuationMetricTab>("PER");
  const chartData = useMemo(
    () => getValuationChartData(stock),
    [stock],
  );

  const themeLabel = themeLabels[stock.theme] ?? stock.theme;
  const baseDateLabel = new Date(stock.valuationMetric.baseDate)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", ".");

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-normal">가치평가</h3>
        <span className="text-sm text-zinc-500">{baseDateLabel} 기준</span>
      </div>

      <div className="mb-4 flex gap-5 text-xs">
        {metricTabs.map((tab) => (
          <button
            key={tab}
            className={`px-0 py-1 ${metric === tab ? "font-bold" : ""}`}
            type="button"
            onClick={() => setMetric(tab)}
          >
            {valuationLabels[tab]}
          </button>
        ))}
      </div>

      <ValuationChart
        data={chartData}
        industryLabel={themeLabel}
        metric={metric}
      />
    </section>
  );
}
