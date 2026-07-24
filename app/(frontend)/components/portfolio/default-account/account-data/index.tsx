import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import type { PortfolioResponse } from "@/app/(frontend)/apis/portfolio/api";
import Link from "next/link";
import React from "react";
import CurrencyExchangeModal from "./currency-exchange-modal";

type AccountDataProps = {
  initialPortfolio?: PortfolioResponse;
};

export default function AccountData({ initialPortfolio }: AccountDataProps) {
  const { data } = useGetPortfolio(undefined, {
    initialData: initialPortfolio,
  });

  if (!data) {
    return null;
  }

  const totalAccountAmount =
    data.totalAvailableOrderAmount === null
      ? null
      : data.totalAvailableOrderAmount + data.totalInvestmentAmount;

  return (
    <div className="col gap-7 rounded-2xl bg-white p-6 md:p-8">
      <div className="w-fit rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-(--cs-text-muted)">
        계좌 {data.accountNumber}
      </div>

      <div className="row flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-4xl font-bold tracking-[-0.04em] text-(--cs-text-strong) md:text-5xl">
            {totalAccountAmount === null
              ? "환율 확인 불가"
              : `${totalAccountAmount.toLocaleString()}원`}
          </p>
        </div>

        <div className="row flex-wrap gap-3">
          <Link
            href="/edu"
            className="row center min-h-10 cursor-pointer rounded-lg border border-(--cs-border-strong) bg-(--cs-surface-raised) px-4 font-semibold text-(--cs-brand-800) shadow-(--cs-shadow-sm) transition hover:bg-(--cs-brand-50)"
          >
            퀴즈 풀고 충전하기
          </Link>

          <CurrencyExchangeModal />
        </div>
      </div>
    </div>
  );
}
