import CreateAccountModal from "./create-account-modal";

export default function NoAccount() {
  return (
    <div className="col center flex-1 gap-8 rounded-2xl bg-white p-6 md:p-8">
      <div className="col center gap-3 text-center">
        <h1 className="text-2xl font-bold md:text-3xl">
          아직 개설된 계좌가 없어요.
        </h1>
        <p className="text-base text-(--cs-text-muted) md:text-lg">
          포트폴리오를 확인하려면 먼저 모의투자 계좌를 개설해 주세요.
        </p>
      </div>

      <CreateAccountModal />
    </div>
  );
}
