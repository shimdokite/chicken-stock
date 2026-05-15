import Input, { SearchIcon } from ".";

export default function InputSample() {
  return (
    <div>
      <h2 className="mb-6 border-b-2 border-dashed border-zinc-950 pb-5 text-4xl font-semibold tracking-normal">
        Input
      </h2>

      <h3 className="mb-5 text-2xl font-semibold tracking-normal">헤더</h3>
      <div className="mb-16 flex flex-wrap items-center gap-4">
        <Input
          aria-label="종목 검색"
          size="sm"
          leftAddon={<SearchIcon className="size-5" />}
          variant="underline"
          placeholder="종목, 용어를 검색해보세요."
          className="w-auto"
        />
      </div>

      <h3 className="mb-5 text-2xl font-semibold tracking-normal">종목 상세</h3>
      <div className="mb-16 grid w-52 gap-3">
        <Input
          aria-label="현재 가격"
          size="sm"
          rightAddon="원"
          placeholder="187,600"
          type="number"
          className="w-26.25"
        />
        <Input
          aria-label="최대 구매 가능"
          size="sm"
          placeholder="최대 9주 가능"
          className="w-26.25"
        />
        <Input
          aria-label="수량"
          size="sm"
          placeholder="수량 입력"
          className="w-26.25"
        />
        <Input
          aria-label="포커스 예시"
          autoFocus
          size="sm"
          className="w-26.25"
        />
        <Input
          aria-label="주수"
          className="w-64"
          inputClassName="font-semibold"
          size="md"
          placeholder="주수입력"
        />
      </div>

      <h3 className="mb-7 text-2xl font-semibold tracking-normal">
        포트폴리오
      </h3>
      <div className="grid w-md gap-5">
        <Input
          aria-label="원화 평가 금액"
          rightAddon="원"
          variant="underline"
        />
        <Input
          aria-label="달러 평가 금액"
          rightAddon="달러"
          variant="underline"
        />
        <div className="mt-12 grid w-72 grid-cols-[4rem_1fr] items-center gap-4">
          <label className="text-xl font-semibold" htmlFor="user-name">
            이름
          </label>
          <Input
            id="user-name"
            inputClassName="text-center text-xl font-semibold text-zinc-400"
            placeholder="김현수"
            variant="underline"
          />
          <label className="text-xl font-semibold" htmlFor="user-phone">
            연락처
          </label>
          <Input
            id="user-phone"
            inputClassName="text-center text-xl font-semibold text-zinc-400"
            placeholder="010-1234-5678"
            variant="underline"
          />
        </div>
      </div>
    </div>
  );
}
