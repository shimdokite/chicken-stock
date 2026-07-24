import { Button } from "@/app/(frontend)/components/ui";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import React from "react";

export default function RealFlow() {
  const { createAccountStep: step, setCreateAccountStep: setStep } =
    usePortfolioStore();

  return (
    <>
      <div className="col flex-1 justify-center gap-5 text-base md:text-lg">
        <div>
          <p>실제 증권사 계좌 개설에서는</p>
          <p>약관 동의, 본인 인증, 투자성향 분석 등의 절차가 포함됩니다.</p>
        </div>

        <div>
          <p>실제 계좌 개설 과정</p>
          <p>1. 약관 동의</p>
          <p>2. 본인 인증</p>
          <p>3. 투자성향 분석</p>
        </div>

        <p className="text-sm text-(--cs-text-muted)">
          (증권사마다 상이할 수 있음을 안내드립니다.)
        </p>

        <div>
          <p>본 서비스는 모의투자 서비스이므로</p>
          <p>
            복잡한 개설 절차는 생략하여 빠르게 투자를 시작할 수 있도록 했습니다.
          </p>
        </div>
      </div>

      <div className="row justify-end gap-3">
        <Button
          className="h-11 min-h-11 w-auto min-w-24 max-w-none flex-none rounded-lg px-5 text-base"
          variant="step-controls"
          onClick={() => setStep(step + 1)}
        >
          다음
        </Button>
      </div>
    </>
  );
}
