import React from "react";

export default function FeesBenefits() {
  return (
    <section className="w-full rounded-2xl bg-white p-6 md:p-8">
      <h1 className="mb-6 text-xl font-bold tracking-[-0.02em]">
        수수료 및 혜택
      </h1>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl bg-zinc-50 p-5">
          <h2 className="text-lg font-semibold">내 수수료</h2>

          <dl className="flex flex-col gap-4">
            <div className="flex justify-between gap-8">
              <dt>국내주식</dt>
              <dd className="text-right font-semibold">0%</dd>
            </div>

            <div className="flex justify-between gap-8">
              <dt>해외주식</dt>
              <dd className="text-right font-semibold">0.1%</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-zinc-50 p-5">
          <h2 className="text-lg font-semibold">받고 있는 혜택</h2>

          <ul className="flex list-disc flex-col gap-3 pl-5 text-(--cs-text-default)">
            <li>$10 이하 거래 시 해외주식 수수료 무료</li>
            <li>환율 우대 95% (영업일 9:10 ~ 15:20)</li>
            <li>해외주식 실시간 시세 평생 무료</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
