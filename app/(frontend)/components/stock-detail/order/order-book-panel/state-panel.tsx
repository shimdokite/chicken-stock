export default function OrderBookStatePanel({ message }: { message: string }) {
  return (
    <section className="flex h-130 items-center justify-center rounded-3xl bg-white px-5 text-center text-base font-medium text-zinc-500 shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
      {message}
    </section>
  );
}
