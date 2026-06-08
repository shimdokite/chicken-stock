"use client";

import { useGetMyInfo } from "../../apis/auth/queries";
import { usePortfolioStore } from "../../stores/portfolio";
import DefaultAccount from "../../components/portfolio/default-account";
import ExpectedDividend from "../../components/portfolio/expected-dividend";
import IncomeAnalysis from "../../components/portfolio/income-analysis";
import NoAccount from "../../components/portfolio/no-account";
import PortfolioTab from "../../components/portfolio/portfolio-tab";
import TransactionHistory from "../../components/portfolio/transaction-history";
import { twMerge } from "tailwind-merge";

export default function PortfolioPage() {
  const { data, isPending } = useGetMyInfo();
  const { selectedTab } = usePortfolioStore();

  if (isPending || !data?.isLoggedIn) {
    return null;
  }

  return (
    <div
      className={twMerge(
        "col min-h-[calc(100dvh-72px)] p-15",
        selectedTab === "거래내역" &&
          "h-[calc(100dvh-72px)] overflow-hidden",
      )}
    >
      <PortfolioTab />

      {!data.user.investmentType && <NoAccount />}

      {data.user.investmentType && (
        <>
          {selectedTab === "기본계좌" && <DefaultAccount />}
          {selectedTab === "거래내역" && <TransactionHistory />}
          {selectedTab === "예상 배당금" && <ExpectedDividend />}
          {selectedTab === "수입분석" && <IncomeAnalysis />}
        </>
      )}
    </div>
  );
}
