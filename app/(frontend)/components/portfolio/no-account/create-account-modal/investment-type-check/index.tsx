import { Button, Select } from "@/app/(frontend)/components/ui";
import { INVESTMENT_SELECTS } from "@/app/(frontend)/constants/portfolio";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import type { InvestmentField } from "@/app/(frontend)/types/portfolio";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { isInvestmentTypeSurveyComplete } from "../../../../../lib/classify-investment-type";

const SELECT_TRIGGER_CLASS_NAME =
  "h-10 rounded-lg border border-(--cs-border-subtle) px-3 shadow-none hover:border-(--cs-border-strong) [&_svg]:size-5 [&_svg]:text-(--cs-text-muted)";
const SELECT_TRIGGER_ERROR_CLASS_NAME =
  "border-red-500 bg-red-50 hover:border-red-500";

export default function InvestmentTypeCheck() {
  const {
    createAccountStep: step,
    setCreateAccountStep: setStep,
    createAccountInfo,
    setCreateAccountInfo,
  } = usePortfolioStore();
  const [isValidationRequested, setIsValidationRequested] = useState(false);

  const handleValueChange = (field: InvestmentField, value: string) => {
    setCreateAccountInfo({
      ...createAccountInfo,
      [field]: value,
    });
  };

  const handleNextButtonClick = () => {
    setIsValidationRequested(true);

    if (!isInvestmentTypeSurveyComplete(createAccountInfo)) {
      return;
    }

    setStep(step + 1);
  };

  return (
    <>
      <div className="col center w-full gap-5">
        {INVESTMENT_SELECTS.map(({ id, label, field, options }) => (
          <div
            className="flex w-full max-w-[485px] flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
            key={field}
          >
            <label
              className="w-full text-base sm:w-[130px] sm:text-right"
              htmlFor={id}
            >
              {label}
            </label>

            <Select
              id={id}
              className="w-full sm:w-[200px]"
              aria-invalid={
                isValidationRequested && !createAccountInfo[field].trim()
              }
              triggerClassName={twMerge(
                SELECT_TRIGGER_CLASS_NAME,
                isValidationRequested &&
                  !createAccountInfo[field].trim() &&
                  SELECT_TRIGGER_ERROR_CLASS_NAME,
              )}
              contentClassName="rounded-xl border border-(--cs-border-subtle) py-1 shadow-(--cs-shadow-md)"
              optionClassName="min-h-10 px-3 text-base"
              options={options}
              value={createAccountInfo[field]}
              onValueChange={(value) => handleValueChange(field, value)}
            />
          </div>
        ))}
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
          variant="step-controls"
          onClick={handleNextButtonClick}
        >
          다음
        </Button>
      </div>
    </>
  );
}
