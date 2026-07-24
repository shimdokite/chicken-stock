"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import DatePicker from "react-datepicker";
import { ko } from "date-fns/locale/ko";
import { Popover } from "@/app/(frontend)/components/ui";
import { useState } from "react";
import type { IncomeMonth } from "@/app/(frontend)/types/portfolio/income-analysis";
import { formatMonthLabel } from "@/app/(frontend)/utils/portfolio/income-analysis";

interface MonthSelectorProps {
  selectedMonth: IncomeMonth;
  onSelectMonth: (month: IncomeMonth) => void;
  setNextMonth: () => void;
  setPreviousMonth: () => void;
}

export default function MonthSelector({
  selectedMonth,
  onSelectMonth,
  setNextMonth,
  setPreviousMonth,
}: MonthSelectorProps) {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const selectedDate = new Date(selectedMonth.year, selectedMonth.month - 1, 1);

  const handleMonthChange = (date: Date | null) => {
    if (!date) {
      return;
    }

    onSelectMonth({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    });
    setMonthPickerOpen(false);
  };

  return (
    <section className="row items-center gap-10 text-sm font-medium">
      <div className="row items-center gap-8">
        <button
          className="cursor-pointer px-1"
          type="button"
          aria-label="이전 달"
          onClick={setPreviousMonth}
        >
          <IconChevronLeft />
        </button>

        <Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
          <Popover.Trigger
            className="cursor-pointer rounded-lg px-2 py-1 transition hover:bg-(--cs-brand-50)"
            aria-label="월 선택"
          >
            <span>{formatMonthLabel(selectedMonth)}</span>
          </Popover.Trigger>

          <Popover.Content align="center" className="w-fit p-3">
            <DatePicker
              inline
              calendarClassName="income-month-calendar"
              dateFormat="yyyy년 M월"
              locale={ko}
              renderCustomHeader={({
                date,
                decreaseYear,
                increaseYear,
                nextYearButtonDisabled,
                prevYearButtonDisabled,
              }) => (
                <div className="row items-center justify-between pb-3">
                  <button
                    aria-label="이전 연도"
                    className="row center size-8 cursor-pointer rounded-lg text-(--cs-text-muted) transition hover:bg-(--cs-brand-50) hover:text-(--cs-brand-800) disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={prevYearButtonDisabled}
                    type="button"
                    onClick={decreaseYear}
                  >
                    <IconChevronLeft aria-hidden="true" className="size-5" />
                  </button>

                  <span className="text-sm font-semibold text-(--cs-text-strong)">
                    {date.getFullYear()}년
                  </span>

                  <button
                    aria-label="다음 연도"
                    className="row center size-8 cursor-pointer rounded-lg text-(--cs-text-muted) transition hover:bg-(--cs-brand-50) hover:text-(--cs-brand-800) disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={nextYearButtonDisabled}
                    type="button"
                    onClick={increaseYear}
                  >
                    <IconChevronRight aria-hidden="true" className="size-5" />
                  </button>
                </div>
              )}
              renderMonthContent={(month) => `${month + 1}월`}
              selected={selectedDate}
              showMonthYearPicker
              onChange={handleMonthChange}
            />
          </Popover.Content>
        </Popover>

        <button
          className="cursor-pointer px-1"
          type="button"
          aria-label="다음 달"
          onClick={setNextMonth}
        >
          <IconChevronRight />
        </button>
      </div>
    </section>
  );
}
