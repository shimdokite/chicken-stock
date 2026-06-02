"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDatum } from "../types";
import { formatCompactMoney } from "../helpers";
import type { StockCurrencyCode } from "../../../../../types/stock/stock-detail";

type EarningsChartProps = {
  currencyCode: StockCurrencyCode;
  data: ChartDatum[];
};

export default function EarningsChart({
  currencyCode,
  data,
}: EarningsChartProps) {
  return (
    <div className="h-48 w-full min-w-0">
      <ResponsiveContainer
        height="100%"
        initialDimension={{ width: 1, height: 192 }}
        width="100%"
      >
        <BarChart
          accessibilityLayer={false}
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="#d4d4d8" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "#d4d4d8" }}
          />
          <YAxis
            width={52}
            tick={{ fill: "#71717a", fontSize: 10 }}
            tickFormatter={(value) =>
              formatCompactMoney(Number(value), currencyCode)
            }
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(244, 114, 182, 0.08)" }}
            formatter={(value, name) => [
              formatCompactMoney(Number(value), currencyCode),
              name === "revenue" ? "예상 매출" : "예상 영업이익",
            ]}
            labelStyle={{ color: "#18181b", fontWeight: 600 }}
          />
          <Legend
            iconType="square"
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) =>
              value === "revenue" ? "예상 매출" : "예상 영업이익"
            }
          />
          <Bar
            dataKey="revenue"
            fill="#f4a6c7"
            stroke="#d34b86"
            strokeWidth={2}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="operatingProfit"
            fill="#b8f3e4"
            stroke="#5dd8bd"
            strokeWidth={2}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
