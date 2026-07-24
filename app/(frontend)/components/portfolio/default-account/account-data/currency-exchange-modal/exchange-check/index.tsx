import { useExchangePortfolio } from "@/app/(frontend)/apis/portfolio/mutations";
import { Button } from "@/app/(frontend)/components/ui";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import React from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";

export default function ExchangeCheck({
  exchangeRate,
  onExchangeSuccess,
  onQuoteExpired,
  quoteToken,
  setStep,
}: {
  exchangeRate: number;
  onExchangeSuccess: () => void;
  onQuoteExpired: () => void;
  quoteToken: string;
  setStep: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { exchangeData, setExchangeData } = usePortfolioStore();
  const { mutate: exchangePortfolio, isPending: isExchangePending } =
    useExchangePortfolio();
  const exchangedValue =
    exchangeData.type === "krwToUsd"
      ? exchangeData.value / exchangeRate
      : exchangeData.value * exchangeRate;
  const sourceAmount = exchangeData.value.toLocaleString("ko-KR");
  const targetAmount = exchangedValue.toLocaleString("ko-KR", {
    maximumFractionDigits: exchangeData.type === "krwToUsd" ? 2 : 0,
  });
  const sourceUnit = exchangeData.type === "krwToUsd" ? "원" : "달러";
  const targetUnit = exchangeData.type === "krwToUsd" ? "달러" : "원";
  const sourceText = `${sourceAmount}${sourceUnit}`;
  const targetText = `${targetAmount}${targetUnit}`;

  const handleExchange = () => {
    exchangePortfolio(
      { ...exchangeData, quoteToken },
      {
        onError: (error) => {
          if (
            isAxiosError<{ code?: string }>(error) &&
            (error.response?.data.code === "EXCHANGE_RATE_QUOTE_EXPIRED" ||
              error.response?.data.code === "EXCHANGE_RATE_QUOTE_INVALID")
          ) {
            toast.error("환율이 갱신되었습니다. 금액을 다시 확인해주세요.");
            onQuoteExpired();
            return;
          }

          toast.error("환전에 실패했습니다. 잔액을 확인해주세요.");
        },
        onSuccess: () => {
          setExchangeData({
            ...exchangeData,
            value: 0,
          });
          onExchangeSuccess();
        },
      },
    );
  };

  return (
    <>
      <div className="col gap-2 pt-4 text-center">
        <p className="text-sm font-semibold text-zinc-500">환전 확인</p>
        <h1 className="text-2xl font-bold">
          {sourceText}을 {targetText}로 바꿀게요
        </h1>
        <p className="text-sm text-zinc-500">
          아래 내용을 확인한 후 환전을 진행해 주세요.
        </p>
      </div>

      <div className="col gap-4 rounded-2xl bg-(--cs-surface-base) p-5 md:p-6">
        <div className="row justify-between gap-6">
          <p>내야할 금액</p>
          <p className="font-semibold">{sourceText}</p>
        </div>

        <div className="row justify-between gap-6">
          <p>적용 환율</p>
          <p className="font-semibold">{exchangeRate.toLocaleString()} 원</p>
        </div>

        <div className="row justify-between gap-6">
          <p>환전 수수료</p>
          <p className="font-semibold">0 원</p>
        </div>
      </div>

      <div className="row justify-end gap-3">
        <Button
          className="min-h-11 min-w-24 rounded-lg border border-zinc-300 bg-white px-5 text-base text-zinc-900 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:outline-none"
          variant="custom"
          onClick={() => setStep("form")}
        >
          이전
        </Button>

        <Button
          className="min-h-11 min-w-24 rounded-lg bg-zinc-900 px-5 text-base text-white hover:bg-black focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:outline-none"
          disabled={isExchangePending}
          variant="custom"
          onClick={handleExchange}
        >
          {isExchangePending && "처리 중"}
          {!isExchangePending && "환전"}
        </Button>
      </div>
    </>
  );
}
