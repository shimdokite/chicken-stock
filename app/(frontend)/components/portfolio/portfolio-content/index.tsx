"use client";

import type { MyInfoResponse } from "@/app/(frontend)/apis/auth/api";
import type { PortfolioResponse } from "@/app/(frontend)/apis/portfolio/api";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { twMerge } from "tailwind-merge";
import DefaultAccount from "../default-account";
import ExpectedDividend from "../expected-dividend";
import IncomeAnalysis from "../income-analysis";
import NoAccount from "../no-account";
import PortfolioTab from "../portfolio-tab";
import TransactionHistory from "../transaction-history";

type PortfolioContentProps = {
  initialMyInfo: MyInfoResponse;
  initialPortfolio: PortfolioResponse;
};

export default function PortfolioContent({
  initialMyInfo,
  initialPortfolio,
}: PortfolioContentProps) {
  const { selectedTab } = usePortfolioStore();

  if (!initialMyInfo.isLoggedIn) {
    return null;
  }

  const isTransactionTab = selectedTab === "거래내역";

  return (
    <div
      className={twMerge(
        "min-h-[calc(100dvh-72px)] bg-[#f8f8f9]",
        isTransactionTab && "h-[calc(100dvh-72px)] overflow-hidden",
      )}
    >
      <div
        className={twMerge(
          "cs-page-shell col min-h-[calc(100dvh-72px)] gap-5 py-8 md:py-12",
          isTransactionTab && "h-full overflow-hidden",
        )}
      >
        <PortfolioTab />

        {!initialMyInfo.user.investmentType && <NoAccount />}

        {initialMyInfo.user.investmentType && (
          <>
            {selectedTab === "기본계좌" && (
              <DefaultAccount initialPortfolio={initialPortfolio} />
            )}
            {selectedTab === "거래내역" && <TransactionHistory />}
            {selectedTab === "예상 배당금" && <ExpectedDividend />}
            {selectedTab === "수입분석" && <IncomeAnalysis />}
          </>
        )}
      </div>
    </div>
  );
}
