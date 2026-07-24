import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import { Button, Input } from "@/app/(frontend)/components/ui";
import SegmentedControl from "@/app/(frontend)/components/ui/segmented-control";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import type { ExchangeType } from "@/app/(frontend)/types/portfolio";
import { IconChevronsDown } from "@tabler/icons-react";
import React from "react";
import { twMerge } from "tailwind-merge";

const TAB = [
  {
    value: "krwToUsd",
    label: "달러로 환전",
  },
  {
    value: "usdToKrw",
    label: "원화로 환전",
  },
];

export default function ExchangeForm({
  exchangeRate,
  setStep,
}: {
  exchangeRate: number;
  setStep: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { exchangeData, setExchangeData } = usePortfolioStore();
  const { data } = useGetPortfolio();
  const formattedExchangeValue = exchangeData.value
    ? exchangeData.value.toLocaleString("ko-KR")
    : "";
  const exchangedValue =
    exchangeData.type === "krwToUsd"
      ? exchangeData.value / exchangeRate
      : exchangeData.value * exchangeRate;
  const formattedExchangedValue = exchangedValue.toLocaleString("ko-KR", {
    maximumFractionDigits: exchangeData.type === "krwToUsd" ? 2 : 0,
  });

  if (!data) {
    return null;
  }

  const availableExchangeBalance =
    exchangeData.type === "krwToUsd" ? data.krwBalance : data.usdBalance;

  const handleExchangeValueChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const nextValue =
      event.target.value === ""
        ? 0
        : Number(event.target.value.replaceAll(",", ""));

    const safeValue = Number.isNaN(nextValue)
      ? 0
      : Math.min(Math.max(nextValue, 0), availableExchangeBalance);

    setExchangeData({
      ...exchangeData,
      value: safeValue,
    });
  };

  const handleExchangeTypeChange = (type: ExchangeType) => {
    if (type === exchangeData.type) {
      return;
    }

    setExchangeData({
      ...exchangeData,
      type,
      value: 0,
    });
  };

  return (
    <>
      <div className="col gap-4">
        <h1 className="text-2xl font-bold">환전하기</h1>

        <SegmentedControl
          aria-label="환전 방향 선택"
          className="w-full"
          onValueChange={(value) =>
            handleExchangeTypeChange(value as ExchangeType)
          }
          value={exchangeData.type}
        >
          {TAB.map((item) => (
            <SegmentedControl.Item
              className="flex-1"
              key={item.value}
              value={item.value}
            >
              {item.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl>
      </div>

      <div className="col center gap-4 py-6">
        <div className="col w-full gap-4 rounded-2xl bg-(--cs-surface-base) p-5 md:p-6">
          <div className="row flex-wrap items-center justify-between gap-2">
            <label className="font-semibold" htmlFor="exchange-source-amount">
              환전할 금액
            </label>
            <span className="text-sm text-zinc-500">
              환전 가능{" "}
              {exchangeData.type === "krwToUsd" &&
                `${data.krwBalance.toLocaleString()}원`}
              {exchangeData.type === "usdToKrw" &&
                `${data.usdBalance.toLocaleString()}달러`}
            </span>
          </div>

          <div className="row center w-full gap-2">
            <Input
              id="exchange-source-amount"
              aria-label="환전할 금액"
              rightAddon={
                <>
                  {exchangeData.type === "krwToUsd" && "원"}
                  {exchangeData.type === "usdToKrw" && "달러"}
                </>
              }
              inputClassName={twMerge(
                exchangeData.type === "krwToUsd" && "pr-7",
                exchangeData.type === "usdToKrw" && "pr-11",
                "text-right text-lg font-semibold",
              )}
              inputMode="decimal"
              value={formattedExchangeValue}
              variant="box"
              onChange={handleExchangeValueChange}
            />
          </div>
        </div>

        <div className="row center text-zinc-700">
          <IconChevronsDown aria-hidden="true" size={24} />
        </div>

        <div className="col w-full gap-4 rounded-2xl bg-(--cs-surface-base) p-5 md:p-6">
          <div className="row flex-wrap items-center justify-between gap-2">
            <label className="font-semibold" htmlFor="exchange-target-amount">
              환전 후 예상 금액
            </label>
            <span className="text-sm text-zinc-500">
              적용 환율 {exchangeRate.toLocaleString()}원
            </span>
          </div>

          <div className="row center w-full gap-2">
            <Input
              id="exchange-target-amount"
              disabled
              aria-label="환전 후 예상 금액"
              rightAddon={
                <>
                  {exchangeData.type === "krwToUsd" && "달러"}
                  {exchangeData.type === "usdToKrw" && "원"}
                </>
              }
              inputClassName={twMerge(
                exchangeData.type === "krwToUsd" && "pr-11",
                exchangeData.type === "usdToKrw" && "pr-7",
                "text-right text-lg font-semibold disabled:cursor-default disabled:bg-white disabled:text-zinc-950",
              )}
              value={formattedExchangedValue}
              variant="box"
            />
          </div>
        </div>
      </div>

      <div className="row justify-end">
        <Button
          className="min-h-11 min-w-24 rounded-lg bg-zinc-900 px-5 text-base text-white hover:bg-black focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:outline-none"
          disabled={!exchangeData.value}
          variant="custom"
          onClick={() => setStep("check")}
        >
          다음
        </Button>
      </div>
    </>
  );
}
