type MetricCardProps = {
  label: string;
  value: string;
};

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className="min-h-18 rounded-xl bg-zinc-100 px-3 py-3">
      <p className="mb-2 text-xs font-semibold text-zinc-950">{label}</p>
      <p className="break-keep text-xl font-medium tracking-normal text-zinc-950">
        {value}
      </p>
    </article>
  );
}
