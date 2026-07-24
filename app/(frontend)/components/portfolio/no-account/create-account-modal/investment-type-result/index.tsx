import { Button } from "@/app/(frontend)/components/ui";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import {
  classifyInvestmentType,
  getInvestmentTypeLabel,
} from "../../../../../lib/classify-investment-type";

export default function InvestmentTypeResult() {
  const {
    createAccountStep: step,
    setCreateAccountStep: setStep,
    createAccountInfo,
  } = usePortfolioStore();

  const investmentType = classifyInvestmentType(createAccountInfo);
  const investmentTypeLabel = investmentType
    ? getInvestmentTypeLabel(investmentType)
    : "미정";
  const userName = createAccountInfo.name.trim() || "고객";

  const handleNextClick = () => {
    if (!investmentType) {
      return;
    }

    setStep(step + 1);
  };

  return (
    <>
      <div className="col center flex-1 gap-6">
        <p className="text-base md:text-lg">{userName}님의 투자성향은</p>
        <p className="text-3xl leading-none font-bold md:text-4xl">
          {investmentTypeLabel}
        </p>
      </div>

      <div className="row justify-end gap-3">
        <Button
          className="h-11 min-h-11 w-auto min-w-24 max-w-none flex-none rounded-lg px-5 text-base"
          variant="step-controls"
          onClick={() => setStep(step - 1)}
        >
          이전
        </Button>

        <Button
          className="h-11 min-h-11 w-auto min-w-24 max-w-none flex-none rounded-lg px-5 text-base"
          disabled={!investmentType}
          variant="step-controls"
          onClick={handleNextClick}
        >
          다음
        </Button>
      </div>
    </>
  );
}
