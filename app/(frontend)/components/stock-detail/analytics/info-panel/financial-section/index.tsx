"use client";

import { useMemo, useState } from "react";
import FinancialTable from "../financial-table";
import MetricCard from "../metric-card";
import {
  formatMetricValue,
  getFinancialTableRows,
  statementLabels,
} from "../helpers";
import type { FinancialStatementTab } from "../types";
import type { StockOnlyProps } from "../../../../../types/stock/stock-detail";

const statementTabs: FinancialStatementTab[] = [
  "INCOME_STATEMENT",
  "BALANCE_SHEET",
  "CASH_FLOW",
];

export default function FinancialSection({ stock }: StockOnlyProps) {
  const [statementType, setStatementType] =
    useState<FinancialStatementTab>("INCOME_STATEMENT");

  const tableData = useMemo(
    () =>
      getFinancialTableRows(
        stock.financialStatements,
        statementType,
        stock.currencyCode,
      ),
    [statementType, stock.currencyCode, stock.financialStatements],
  );

  return (
    <section>
      <h3 className="mb-5 text-2xl font-semibold tracking-normal">재무</h3>
      <div className="mb-14 grid grid-cols-3 gap-4">
        <MetricCard
          label="부채비율"
          value={formatMetricValue(stock.financialMetric?.debtRatio)}
        />
        <MetricCard
          label="유동비율"
          value={formatMetricValue(stock.financialMetric?.currentRatio)}
        />
        <MetricCard
          label="이자보상비율"
          value={formatMetricValue(
            stock.financialMetric?.interestCoverageRatio,
          )}
        />
      </div>

      <h4 className="mb-3 text-2xl font-semibold tracking-normal">재무제표</h4>
      <div className="mb-3 flex gap-6 text-xs">
        {statementTabs.map((tab) => (
          <button
            key={tab}
            className={`px-0 py-1 ${statementType === tab ? "font-bold" : ""}`}
            type="button"
            onClick={() => setStatementType(tab)}
          >
            {statementLabels[tab]}
          </button>
        ))}
      </div>

      <FinancialTable columns={tableData.columns} rows={tableData.rows} />
    </section>
  );
}
