import { IconCheck } from "@tabler/icons-react";

export type ArticleProgressIconProps = {
  progressRate?: number;
  isCompleted?: boolean;
};

function clampProgressRate(progressRate: number | undefined) {
  if (progressRate === undefined) {
    return 0;
  }

  return Math.min(100, Math.max(0, progressRate));
}

export default function ArticleProgressIcon({
  progressRate: progressRateValue,
  isCompleted,
}: ArticleProgressIconProps) {
  const progressRate = clampProgressRate(progressRateValue);

  if (isCompleted) {
    return (
      <IconCheck
        aria-label="읽음"
        className="size-7 shrink-0 text-emerald-400"
        stroke={2.4}
      />
    );
  }

  if (progressRate <= 0) {
    return null;
  }

  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * progressRate) / 100;

  return (
    <svg
      role="img"
      aria-label={`진행률 ${progressRate}%`}
      className="size-7 shrink-0 -rotate-90 text-violet-300"
      viewBox="0 0 26 26"
    >
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="2"
      />
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
}
