import * as Tab from ".";

export default function TabSample() {
  return (
    <div className="flex w-fit flex-col gap-4 rounded border bg-white p-5">
      <h1 className="text-black">Tab Sample</h1>

      <Tab.Root defaultValue="차트 / 호가" direction="row" type="fill">
        <Tab.Item className="p-1.5 text-xl" value="차트 / 호가">
          차트 / 호가
        </Tab.Item>
        <Tab.Item className="p-1.5 text-xl" value="내 주식 / 종목 정보">
          내 주식 / 종목 정보
        </Tab.Item>
      </Tab.Root>

      <Tab.Root defaultValue="기본계좌" direction="row" type="fill">
        <Tab.Item
          className="px-15 py-4.5 text-xl font-semibold"
          value="기본계좌"
        >
          기본계좌
        </Tab.Item>
        <Tab.Item
          className="px-15 py-4.5 text-xl font-semibold"
          value="거래내역"
        >
          거래내역
        </Tab.Item>
        <Tab.Item
          className="px-15 py-4.5 text-xl font-semibold"
          value="예상 배당금"
        >
          예상 배당금
        </Tab.Item>
        <Tab.Item
          className="px-15 py-4.5 text-xl font-semibold"
          value="수입분석"
        >
          수입분석
        </Tab.Item>
      </Tab.Root>

      <Tab.Root defaultValue="달러로 환전" direction="row" type="fill">
        <Tab.Item className="px-20 py-2 text-xl" value="달러로 환전">
          달러로 환전
        </Tab.Item>
        <Tab.Item className="px-20 py-2 text-xl" value="원화로 환전">
          원화로 환전
        </Tab.Item>
      </Tab.Root>

      <div className="h-px bg-gray-200" />

      <Tab.Root
        className="gap-2"
        defaultValue="일반주문"
        direction="row"
        type="underline"
      >
        <Tab.Item className="text-lg" value="일반주문">
          일반주문
        </Tab.Item>
        <Tab.Item className="text-lg" value="간편주문">
          간편주문
        </Tab.Item>
      </Tab.Root>

      <Tab.Root
        className="gap-2"
        defaultValue="재무"
        direction="col"
        type="underline"
      >
        <Tab.Item className="text-xl" value="재무">
          재무
        </Tab.Item>
        <Tab.Item className="text-xl" value="실적">
          실적
        </Tab.Item>
        <Tab.Item className="text-xl" value="배당">
          배당
        </Tab.Item>
        <Tab.Item className="text-xl" value="가치평가">
          가치평가
        </Tab.Item>
      </Tab.Root>

      <Tab.Root
        className="gap-8"
        defaultValue="전체"
        direction="row"
        type="underline"
      >
        <Tab.Item className="text-xl" value="전체">
          전체
        </Tab.Item>
        <Tab.Item className="text-xl" value="거래">
          거래
        </Tab.Item>
        <Tab.Item className="text-xl" value="환전">
          환전
        </Tab.Item>
        <Tab.Item className="text-xl" value="입출금">
          입출금
        </Tab.Item>
      </Tab.Root>

      <Tab.Root
        className="gap-10"
        defaultValue="판매수익"
        direction="row"
        type="underline"
      >
        <Tab.Item className="text-sm" value="판매수익">
          판매수익
        </Tab.Item>
        <Tab.Item className="text-sm" value="전체">
          전체
        </Tab.Item>
        <Tab.Item className="text-sm" value="일별">
          일별
        </Tab.Item>
      </Tab.Root>
    </div>
  );
}
