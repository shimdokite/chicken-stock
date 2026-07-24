import { Modal } from "@/app/(frontend)/components/ui";
import PersonalInfo from "./personal-info";
import InvestmentTypeCheck from "./investment-type-check";
import InvestmentTypeResult from "./investment-type-result";
import RealFlow from "./real-flow";
import AccountCreationComplete from "./account-creation-complete";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authQueryKeys } from "@/app/(frontend)/apis/auth/queries";
import { useCreatePortfolio } from "@/app/(frontend)/apis/portfolio/mutations";
import { classifyInvestmentType } from "@/app/(frontend)/lib/classify-investment-type";

const STEPS = [
  {
    title: "개인정보 입력",
  },

  {
    title: "투자 성향 분석",
  },

  {
    title: "투자 성향 분석 결과",
  },

  {
    title: "실제 증권사에서는 이렇게 해요",
  },

  {
    title: "신규 계좌 개설 완료",
  },
];

export default function CreateAccountModal() {
  const {
    createAccountInfo,
    createAccountStep: step,
    clearPortfolioStore,
  } = usePortfolioStore();
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { mutate: createPortfolio, isPending: isCreatePortfolioPending } =
    useCreatePortfolio();
  const investmentType = classifyInvestmentType(createAccountInfo);

  const invalidateMyInfo = () => {
    void queryClient.invalidateQueries({ queryKey: authQueryKeys.myInfo });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);

    if (!nextOpen) {
      invalidateMyInfo();
      clearPortfolioStore();
    }
  };

  const handleComplete = () => {
    if (!investmentType) {
      return;
    }

    createPortfolio(
      { investmentType },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
      },
    );
  };

  const stepComponent = [
    <PersonalInfo key="personal-info" />,
    <InvestmentTypeCheck key="investment-type-check" />,
    <InvestmentTypeResult key="investment-type-result" />,
    <RealFlow key="real-flow" />,
    <AccountCreationComplete
      key="account-creation-complete"
      isPending={isCreatePortfolioPending}
      onConfirm={handleComplete}
    />,
  ][step];

  return (
    <Modal.Root
      isOpen={isOpen}
      setIsOpen={handleOpenChange}
      closeOnOverlayClick={false}
    >
      <Modal.Trigger className="min-h-11 cursor-pointer rounded-lg bg-(--cs-brand-700) px-5 text-base font-semibold text-white hover:bg-(--cs-brand-800)">
        계좌 개설하기
      </Modal.Trigger>

      <Modal.Overlay>
        <Modal.Content className="col min-h-[565px] w-full max-w-[650px] justify-between">
          <div className="border-b border-(--cs-border-subtle) pr-10 pb-4">
            <h1 className="text-2xl font-bold text-(--cs-text-strong)">
              {STEPS[step].title}
            </h1>
          </div>

          {stepComponent}
        </Modal.Content>
      </Modal.Overlay>
    </Modal.Root>
  );
}
