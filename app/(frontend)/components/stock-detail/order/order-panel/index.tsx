// TODO: 추후 실제 데이터로 변경 예정
import { Tab } from "../../../ui";
import type { StockOnlyProps } from "../../../../types/stock/stock-detail";
import { formatPrice } from "../../../../utils/stock/stock-detail";

export default function OrderPanel({ stock }: StockOnlyProps) {
  return (
    <aside className="h-130 border-4 border-[#ff260d] bg-white p-6">
      <Tab.Root defaultValue="normal" className="mb-5 gap-0 bg-transparent p-0">
        <Tab.Item
          value="normal"
          className="rounded-none px-0 text-xl"
          activeClassName="font-bold"
        >
          일반주문
        </Tab.Item>
        <Tab.Item
          value="quick"
          className="rounded-none px-0 pl-1 text-xl"
          activeClassName="font-bold"
        >
          간편주문
        </Tab.Item>
      </Tab.Root>

      <div className="mb-3 flex h-9 items-center justify-between rounded-lg border-3 border-zinc-200 px-3 text-lg font-semibold text-zinc-950">
        <span>주수입력</span>
        <span className="text-zinc-300">- +</span>
      </div>

      <div className="mb-4 flex gap-2">
        {["1주", "10주", "100주", "최대"].map((label) => (
          <button
            key={label}
            className="h-9 flex-1 rounded-lg bg-zinc-300 text-base text-zinc-700"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <dl className="mb-5 grid grid-cols-2 gap-y-2 text-base">
        <dt>판매가능</dt>
        <dd className="text-right">0주</dd>
        <dt>판매예상</dt>
        <dd className="text-right">1주</dd>
        <dt>구매가능</dt>
        <dd className="text-right">
          {formatPrice(stock.currentPrice * 10, stock.currencyCode)}
        </dd>
        <dt>구매예상</dt>
        <dd className="text-right">
          {formatPrice(stock.currentPrice, stock.currencyCode)}
        </dd>
      </dl>

      <div className="mb-5 grid grid-cols-2 gap-2 text-base font-semibold">
        <button
          className="rounded-lg bg-sky-300 py-3 text-sky-700"
          type="button"
        >
          현재가 판매
        </button>
        <button
          className="rounded-lg bg-red-300 py-3 text-red-600"
          type="button"
        >
          현재가 구매
        </button>
        <button
          className="rounded-lg bg-sky-300 py-3 text-sky-700"
          type="button"
        >
          시장가 판매
        </button>
        <button
          className="rounded-lg bg-red-300 py-3 text-red-600"
          type="button"
        >
          시장가 구매
        </button>
      </div>

      <button
        className="mb-6 w-full rounded-lg bg-zinc-300 py-3 text-lg font-semibold text-zinc-600"
        type="button"
      >
        주문 1건 전체 취소
      </button>

      <dl className="grid grid-cols-2 gap-y-2 text-lg">
        <dt>내 주식 평균</dt>
        <dd className="text-right">{formatPrice(0, stock.currencyCode)}</dd>
        <dt>현재 수익</dt>
        <dd className="text-right">{formatPrice(0, stock.currencyCode)}</dd>
      </dl>
    </aside>
  );
}
