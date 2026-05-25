import MarketIndex, { type MarketIndexData } from "./market_index";

// TODO: 추후 실제 데이터로 변경 예정
const dummyMarketIndexes: MarketIndexData[] = [
  {
    name: "달러 환율",
    value: "1,478.55",
    changeValue: "+11.25",
    changeRate: "0.76%",
    trend: "up",
  },
  {
    name: "코스피",
    value: "5,566.98",
    changeValue: "-42.51",
    changeRate: "0.75%",
    trend: "down",
  },
  {
    name: "코스닥",
    value: "1,478.55",
    changeValue: "+1.27",
    changeRate: "0.08%",
    trend: "up",
  },
  {
    name: "나스닥",
    value: "22,716.13.55",
    changeValue: "+19.03",
    changeRate: "0.08%",
    trend: "up",
  },
  {
    name: "S&P 500",
    value: "5,566.98",
    changeValue: "-42.51",
    changeRate: "0.75%",
    trend: "down",
  },
];

export default function IndexList() {
  return (
    <section className="w-auto bg-white pt-16 pr-8 pb-8 pl-8">
      <ul className="flex h-full flex-col justify-between gap-3.5">
        {dummyMarketIndexes.map((marketIndex) => (
          <li key={marketIndex.name}>
            <MarketIndex marketIndex={marketIndex} />
          </li>
        ))}
      </ul>
    </section>
  );
}
