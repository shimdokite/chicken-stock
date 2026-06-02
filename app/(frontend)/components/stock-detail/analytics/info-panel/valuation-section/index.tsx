"use client";

import { useMemo, useState } from "react";
import ValuationChart from "../valuation-chart";
import { getValuationChartData, valuationLabels } from "../helpers";
import type { ValuationMetricTab } from "../types";
import type { StockOnlyProps } from "../../../../../types/stock/stock-detail";

const metricTabs: ValuationMetricTab[] = ["PER", "PBR"];
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
    () => getValuationChartData(stock, metric),
    [metric, stock],
  );

  const themeLabel = themeLabels[stock.theme] ?? stock.theme;

  return (
    <section>
      <h3 className="mb-4 text-2xl font-semibold tracking-normal">가치평가</h3>
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
