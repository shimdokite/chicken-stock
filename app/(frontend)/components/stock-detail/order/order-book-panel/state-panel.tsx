export default function OrderBookStatePanel({ message }: { message: string }) {
  return (
    <section className="cs-data-panel flex h-130 items-center justify-center px-5 text-center text-base font-medium text-(--cs-text-muted)">
      {message}
    </section>
  );
}
