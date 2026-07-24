import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import type { PortfolioResponse } from "@/app/(frontend)/apis/portfolio/api";
import React from "react";

type BalanceDataProps = {
  initialPortfolio?: PortfolioResponse;
};

export default function BalanceData({ initialPortfolio }: BalanceDataProps) {
  const { data } = useGetPortfolio(undefined, {
    initialData: initialPortfolio,
  });

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="row justify-between gap-6 rounded-2xl bg-white px-5 py-5 text-base md:px-6 md:py-6 md:text-lg">
        <p>총 주문 가능 금액</p>
        <p className="text-right font-bold tabular-nums">
          {data.totalAvailableOrderAmount === null
            ? "확인할 수 없음"
            : `${data.totalAvailableOrderAmount.toLocaleString()} 원`}
        </p>
      </div>

      <div className="row justify-between gap-6 rounded-2xl bg-white px-5 py-5 text-base md:px-6 md:py-6 md:text-lg">
        <p>총 투자 금액</p>
        <p className="text-right font-bold tabular-nums">
          {data.totalInvestmentAmount.toLocaleString()} 원
        </p>
      </div>

      <div className="row justify-between gap-6 rounded-2xl bg-white px-5 py-5 text-base md:px-6 md:py-6 md:text-lg">
        <p>원화</p>
        <p className="font-semibold tabular-nums">
          {data.krwBalance.toLocaleString()} 원
        </p>
      </div>

      <div className="row justify-between gap-6 rounded-2xl bg-white px-5 py-5 text-base md:px-6 md:py-6 md:text-lg">
        <p>국내주식</p>
        <p className="font-semibold tabular-nums">
          {data.domesticStockAmount.toLocaleString()} 원
        </p>
      </div>

      <div className="row justify-between gap-6 rounded-2xl bg-white px-5 py-5 text-base md:px-6 md:py-6 md:text-lg">
        <p>달러</p>
        <p className="font-semibold tabular-nums">
          {data.usdBalance.toLocaleString()} 달러
        </p>
      </div>

      <div className="row justify-between gap-6 rounded-2xl bg-white px-5 py-5 text-base md:px-6 md:py-6 md:text-lg">
        <p>해외주식</p>
        <p className="font-semibold tabular-nums">
          {data.foreignStockAmount.toLocaleString()} 달러
        </p>
      </div>
    </div>
  );
}
