"use client";

import { twMerge } from "tailwind-merge";

type StockDetailPanelSkeletonProps = {
  className?: string;
  label: string;
};

export default function StockDetailPanelSkeleton({
  className,
  label,
}: StockDetailPanelSkeletonProps) {
  return (
    <section
      className={twMerge(
        "cs-data-panel grid h-130 place-items-center px-7 py-6 text-sm text-(--cs-text-muted)",
        className,
      )}
    >
      {label}
    </section>
  );
}
