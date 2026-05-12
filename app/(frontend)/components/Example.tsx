import {
  Dropdown,
  Input,
  SearchIcon,
  SegmentedControl,
} from "./ui";

const marketOptions = [
  { label: "전체", value: "all" },
  { label: "국내", value: "domestic" },
  { label: "해외", value: "global" },
];

const chartOptions = [
  { label: "거래대금", value: "amount" },
  { label: "거래량", value: "volume" },
];

const periodOptions = [
  { label: "실시간", value: "live" },
  { label: "1일", value: "1d" },
  { label: "1주일", value: "1w" },
  { label: "1개월", value: "1m" },
  { label: "3개월", value: "3m" },
  { label: "6개월", value: "6m" },
  { label: "1년", value: "1y" },
];

const orderOptions = [
  { label: "구매", value: "buy", labelWidth: 80, selectedTextColor: "#ef4444" },
  {
    label: "판매",
    value: "sell",
    labelWidth: 80,
    selectedTextColor: "#3b82f6",
  },
  {
    label: "대기",
    value: "wait",
    labelWidth: 80,
    selectedTextColor: "#22c55e",
  },
];

const priceTypeOptions = [
  { label: "지정가", value: "limit" },
  { label: "시장가", value: "market" },
];

const graphPeriodOptions = [
  { label: "일", value: "day" },
  { label: "주", value: "week" },
  { label: "월", value: "month" },
  { label: "년", value: "year" },
];

const dropdownItems = [
  {
    label: "김현수",
    value: "kim",
    icon: (
      <span className="grid size-8 place-items-center rounded-full bg-lime-900 text-sm text-lime-200">
        김
      </span>
    ),
  },
  { label: "마이페이지", value: "mypage" },
  { label: "계좌 설정", value: "account" },
];

const recentSearches = ["스피어", "TIGER 미국나스닥100커버드콜(합성)", "천보"];

export default function Example() {
  return (
    <main className="min-h-screen bg-white px-10 py-9 font-sans text-zinc-950">
      <section className="border-b-2 border-dashed border-zinc-950 pb-5">
        <h1 className="text-4xl font-bold tracking-normal">Common UI</h1>
      </section>

      <section className="grid gap-20 py-8">
        <div>
          <h2 className="mb-6 text-4xl font-semibold tracking-normal">Input</h2>
          <div className="mb-16 flex flex-wrap items-center gap-4">
            <Input
              aria-label="종목 검색"
              containerClassName=""
              inputSize="sm"
              leftIcon={<SearchIcon className="size-5" />}
              placeholder="종목, 용어를 검색해보세요."
              variant="underline"
            />
            <Input
              aria-label="검색어 입력"
              containerClassName=""
              inputSize="sm"
              leftIcon={<SearchIcon className="size-5" />}
              placeholder="검색어를 입력해주세요"
              variant="underline"
            />
          </div>

          <h3 className="mb-5 text-4xl font-semibold tracking-normal">
            종목 상세
          </h3>
          <div className="mb-16 grid w-52 gap-3">
            <Input
              aria-label="현재 가격"
              inputSize="sm"
              placeholder="187,600 원"
            />
            <Input
              aria-label="최대 구매 가능"
              inputSize="sm"
              placeholder="최대 9주 가능"
            />
            <Input aria-label="수량" inputSize="sm" placeholder="수량 입력" />
            <Input
              aria-label="포커스 예시"
              autoFocus
              className="w-32"
              inputSize="sm"
            />
            <Input
              aria-label="주수"
              className="w-64 font-semibold"
              inputSize="md"
              placeholder="주수입력"
            />
          </div>

          <h3 className="mb-7 text-4xl font-semibold tracking-normal">
            포트폴리오
          </h3>
          <div className="grid w-[28rem] gap-5">
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
                className="text-center text-xl font-semibold text-zinc-400"
                placeholder="김현수"
                variant="underline"
              />
              <label className="text-xl font-semibold" htmlFor="user-phone">
                연락처
              </label>
              <Input
                id="user-phone"
                className="text-center text-xl font-semibold text-zinc-400"
                placeholder="010-1234-5678"
                variant="underline"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-7 text-4xl font-semibold tracking-normal">
            Segmented Control
          </h2>
          <div className="mb-20 flex flex-wrap items-center gap-6">
            <SegmentedControl
              aria-label="시장 선택"
              defaultValue="all"
              options={marketOptions}
            />
            <SegmentedControl
              aria-label="차트 기준"
              defaultValue="amount"
              options={chartOptions}
            />
            <SegmentedControl
              aria-label="기간 선택"
              defaultValue="live"
              options={periodOptions}
            />
          </div>

          <h3 className="mb-6 text-4xl font-semibold tracking-normal">
            종목 상세
          </h3>
          <div className="flex flex-wrap items-center gap-5">
            <SegmentedControl
              aria-label="통화 선택"
              defaultValue="krw"
              options={[
                { label: "달러", value: "usd" },
                { label: "원", value: "krw" },
              ]}
              selectedStyle="text"
            />
            <SegmentedControl
              aria-label="주문 유형"
              defaultValue="buy"
              options={orderOptions}
            />
            <SegmentedControl
              aria-label="가격 유형"
              defaultValue="limit"
              options={priceTypeOptions}
            />
          </div>
          <div className="mt-8 ml-28">
            <SegmentedControl
              aria-label="그래프 기간"
              defaultValue="day"
              options={graphPeriodOptions}
              selectedStyle="inverted-panel"
            />
          </div>
        </div>

        <div className="bg-zinc-300 p-8">
          <h2 className="mb-6 text-4xl font-semibold tracking-normal">
            Dropdown
          </h2>
          <div className="mb-5 flex flex-wrap items-start gap-4">
            <Dropdown items={dropdownItems} className="w-80" />
            <button
              className="flex h-14 w-80 items-center justify-center gap-4 rounded-md bg-white px-4 text-base font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              type="button"
            >
              <span className="text-3xl font-bold text-blue-500">G</span>
              구글 계정으로 로그인
            </button>
          </div>
          <div className="w-[34rem] rounded-md bg-white p-3">
            <Input
              aria-label="최근 검색"
              className="bg-zinc-300"
              inputSize="sm"
              leftIcon={<SearchIcon className="size-4" />}
              placeholder="검색어를 입력해주세요"
              variant="pill"
              focusable={false}
            />
            <p className="mt-4 mb-2 text-sm font-semibold">최근 검색</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search) => (
                <span
                  key={search}
                  className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-semibold text-zinc-500"
                >
                  {search} ×
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
