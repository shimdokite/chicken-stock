import { Button, Input } from "@/app/(frontend)/components/ui";
import formatPhoneNumber from "@/app/(frontend)/lib/format-phone-number";
import { usePortfolioStore } from "@/app/(frontend)/stores/portfolio";
import { ChangeEvent, useState } from "react";

const PHONE_NUMBER_PATTERN = /^\d{3}-\d{4}-\d{4}$/;

export default function PersonalInfo() {
  const {
    createAccountStep: step,
    setCreateAccountStep: setStep,
    createAccountInfo,
    setCreateAccountInfo,
  } = usePortfolioStore();
  const [nameErrorMessage, setNameErrorMessage] = useState("");
  const [phoneNumberErrorMessage, setPhoneNumberErrorMessage] = useState("");

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;

    setCreateAccountInfo({
      ...createAccountInfo,
      name,
    });

    if (name.trim()) {
      setNameErrorMessage("");
    }
  };

  const handlePhoneNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = formatPhoneNumber(event.target.value);

    setCreateAccountInfo({
      ...createAccountInfo,
      phoneNumber,
    });

    if (PHONE_NUMBER_PATTERN.test(phoneNumber)) {
      setPhoneNumberErrorMessage("");
    }
  };

  const handleNextButtonClick = () => {
    const nameError = createAccountInfo.name.trim()
      ? ""
      : "이름은 빈문자열일 수 없습니다.";
    const phoneNumberError = PHONE_NUMBER_PATTERN.test(
      createAccountInfo.phoneNumber,
    )
      ? ""
      : "휴대번호는 000-0000-0000 양식이어야 합니다.";

    setNameErrorMessage(nameError);
    setPhoneNumberErrorMessage(phoneNumberError);

    if (nameError || phoneNumberError) {
      return;
    }

    setStep(step + 1);
  };

  return (
    <>
      <div className="col center w-full gap-5">
        <div className="grid w-full max-w-sm gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
          <label className="text-base" htmlFor="user-name">
            이름
          </label>
          <Input
            id="user-name"
            className="w-full"
            inputClassName="text-base text-black placeholder:text-zinc-400 sm:text-lg"
            value={createAccountInfo.name}
            onChange={handleNameChange}
            placeholder="김현수"
            variant="underline"
            errorMessage={nameErrorMessage}
          />
        </div>

        <div className="grid w-full max-w-sm gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
          <label className="text-base" htmlFor="user-phone">
            연락처
          </label>
          <Input
            id="user-phone"
            className="w-full"
            inputClassName="text-base text-black placeholder:text-zinc-400 sm:text-lg"
            inputMode="numeric"
            maxLength={13}
            autoComplete="tel"
            placeholder="010-1234-5678"
            value={createAccountInfo.phoneNumber}
            onChange={handlePhoneNumberChange}
            variant="underline"
            errorMessage={phoneNumberErrorMessage}
          />
        </div>
      </div>

      <div className="row justify-end gap-3">
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
