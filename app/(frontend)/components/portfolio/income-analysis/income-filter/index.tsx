import SegmentedControl from "@/app/(frontend)/components/ui/segmented-control";
import type { IncomeAnalysisView } from "@/app/(frontend)/types/portfolio/income-analysis";

const incomeAnalysisViews: Array<{
  label: string;
  value: IncomeAnalysisView;
}> = [
  { label: "전체", value: "전체" },
  { label: "국내", value: "국내주식" },
  { label: "해외", value: "해외주식" },
];

interface IncomeFilterProps {
  selectedView: IncomeAnalysisView;
  setSelectedView: (view: IncomeAnalysisView) => void;
}

export default function IncomeFilter({
  selectedView,
  setSelectedView,
}: IncomeFilterProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 py-5">
      <h2 className="text-xl leading-tight font-bold tracking-[-0.02em]">
        판매수익
      </h2>

      <SegmentedControl
        aria-label="종목 시장 선택"
        onValueChange={(value) => setSelectedView(value as IncomeAnalysisView)}
        value={selectedView}
      >
        {incomeAnalysisViews.map((view) => (
          <SegmentedControl.Item key={view.value} value={view.value}>
            {view.label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>
    </div>
  );
}
