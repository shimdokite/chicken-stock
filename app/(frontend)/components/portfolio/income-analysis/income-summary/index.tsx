import type { IncomeSummaryData } from "@/app/(frontend)/types/portfolio/income-analysis";
import { formatSignedWon } from "@/app/(frontend)/utils/portfolio/income-analysis";

interface IncomeSummaryProps {
  summary: IncomeSummaryData;
}

export default function IncomeSummary({ summary }: IncomeSummaryProps) {
  return (
    <section className="col gap-3 rounded-2xl bg-white p-6 md:p-8">
      <p className="text-sm font-medium">총 실현수익</p>

      <div className="row flex-wrap items-end gap-x-12 gap-y-3">
        <p className="text-2xl font-bold">
          {formatSignedWon(summary.totalRealizedIncome)}
        </p>

        {/* <div className="row flex-wrap gap-x-8 gap-y-2 text-xs font-medium">
          <span>판매 수익 {formatSignedWon(summary.saleProfit)}</span>
          <span>배당금 {formatSignedWon(summary.dividendIncome)}</span>
          <span>계좌이자 {formatSignedWon(summary.accountInterest)}</span>
        </div> */}
      </div>
    </section>
  );
}
