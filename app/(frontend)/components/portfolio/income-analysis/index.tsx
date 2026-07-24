import { useState } from "react";
import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import IncomeFilter from "./income-filter";
import IncomeSummary from "./income-summary";
import MonthSelector from "./month-selector";
import SaleIncomeTable from "./sale-income-table";
// import SaleProfitTotal from "./sale-profit-total";
import {
  getCurrentIncomeMonth,
  getIncomeAnalysis,
  getNextIncomeMonth,
  getPreviousIncomeMonth,
} from "@/app/(frontend)/utils/portfolio/income-analysis";
import type {
  IncomeAnalysisView,
  IncomeMonth,
} from "@/app/(frontend)/types/portfolio/income-analysis";

export default function IncomeAnalysis() {
  const [selectedMonth, setSelectedMonth] = useState<IncomeMonth>(() =>
    getCurrentIncomeMonth(),
  );
  const { data } = useGetPortfolio({
    incomeMonth: selectedMonth.month,
    incomeYear: selectedMonth.year,
  });
  const [selectedView, setSelectedView] = useState<IncomeAnalysisView>("전체");

  if (!data) {
    return null;
  }

  const analysis = getIncomeAnalysis(
    data.transactions,
    data.items,
    selectedMonth,
    selectedView,
  );

  return (
    <div className="col gap-5">
      <MonthSelector
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        setNextMonth={() => setSelectedMonth(getNextIncomeMonth(selectedMonth))}
        setPreviousMonth={() =>
          setSelectedMonth(getPreviousIncomeMonth(selectedMonth))
        }
      />

      <IncomeSummary summary={analysis.summary} />

      <section className="w-full rounded-2xl bg-white px-6 text-(--cs-text-strong) md:px-8">
        <IncomeFilter
          selectedView={selectedView}
          setSelectedView={setSelectedView}
        />

        <SaleIncomeTable rows={analysis.saleIncomeRows} />
      </section>

      {/* <SaleProfitTotal totalSaleProfit={analysis.summary.saleProfit} /> */}
    </div>
  );
}
