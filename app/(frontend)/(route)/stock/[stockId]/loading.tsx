export default function StockDetailLoading() {
  return (
    <main className="min-h-[calc(100dvh-72px)] bg-[#f8f8f9] py-8 md:py-12">
      <div className="cs-page-shell text-(--cs-text-strong)">
        <section className="mb-5 flex items-end justify-between gap-8 rounded-2xl bg-white p-5 lg:p-7">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-zinc-200" />

            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="h-8 w-36 rounded-md bg-zinc-200" />
                <div className="h-8 w-20 rounded-md bg-zinc-200" />
              </div>

              <div className="h-8 w-96 rounded-md bg-zinc-200" />
            </div>
          </div>

          <dl className="grid grid-cols-4 gap-10 text-right">
            {["high", "low", "year-high", "year-low"].map((item) => (
              <div key={item}>
                <dt className="mb-2 h-5 w-16 rounded-md bg-zinc-200" />
                <dd className="mt-1 h-5 w-24 rounded-md bg-zinc-200" />
              </div>
            ))}
          </dl>
        </section>

        <div className="mb-5 flex gap-3">
          <div className="h-10 w-32 rounded-md bg-zinc-200" />
          <div className="h-10 w-48 rounded-md bg-zinc-200" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem_20rem]">
          <section className="cs-data-panel h-130 px-5 py-5 md:px-7 md:py-6">
            <div className="mb-6 flex gap-3">
              <div className="h-8 w-16 rounded-md bg-zinc-200" />
              <div className="h-8 w-16 rounded-md bg-zinc-200" />
              <div className="h-8 w-16 rounded-md bg-zinc-200" />
            </div>
            <div className="h-[25rem] rounded-xl bg-zinc-100" />
          </section>

          <section className="cs-data-panel h-130 overflow-hidden px-5 py-5">
            <div className="mb-5 h-7 w-24 rounded-md bg-zinc-200" />
            <div className="space-y-2">
              {Array.from({ length: 10 }, (_, index) => (
                <div
                  key={index}
                  className="grid h-8 grid-cols-[4rem_minmax(0,1fr)_4rem] gap-3"
                >
                  <div className="rounded-md bg-zinc-200" />
                  <div className="rounded-md bg-zinc-100" />
                  <div className="rounded-md bg-zinc-200" />
                </div>
              ))}
            </div>
          </section>

          <section className="cs-data-panel h-130 px-5 py-5">
            <div className="mb-5 flex gap-4">
              <div className="h-8 w-20 rounded-md bg-zinc-200" />
              <div className="h-8 w-20 rounded-md bg-zinc-200" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="h-10 rounded-lg bg-zinc-100" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
