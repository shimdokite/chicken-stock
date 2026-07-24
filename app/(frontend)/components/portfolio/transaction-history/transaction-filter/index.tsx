import SegmentedControl from "@/app/(frontend)/components/ui/segmented-control";
import { TRANSACTION_HISTORY_FILTERS } from "@/app/(frontend)/constants/portfolio";
import type { TransactionHistoryFilter } from "@/app/(frontend)/types/portfolio";

interface TransactionFilterProps {
  selectedFilter: TransactionHistoryFilter;
  setSelectedFilter: (filter: TransactionHistoryFilter) => void;
}

export default function TransactionFilter({
  selectedFilter,
  setSelectedFilter,
}: TransactionFilterProps) {
  return (
    <SegmentedControl
      aria-label="거래 유형 선택"
      className="w-fit"
      onValueChange={(value) =>
        setSelectedFilter(value as TransactionHistoryFilter)
      }
      value={selectedFilter}
    >
      {TRANSACTION_HISTORY_FILTERS.map((filter) => (
        <SegmentedControl.Item key={filter} value={filter}>
          {filter}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl>
  );
}
