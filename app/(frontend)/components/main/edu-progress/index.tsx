"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useGetMyInfo } from "../../../apis/auth/queries";
import { useEducationSummariesQuery } from "../../../apis/edu/queries";

const LEVEL_THEMES: Record<
  number,
  {
    background: string;
    characterAlt: string;
    characterImage: string;
    progressGradient: string;
    progressTrack: string;
    text: string;
  }
> = {
  1: {
    background: "bg-[#EAEBCD]",
    characterAlt: "알에서 성장 중인 레벨 1 학습 캐릭터",
    characterImage: "/images/main/edu_progress_egg.png",
    progressGradient: "from-[#FFB285] to-[#FF8F5B]",
    progressTrack: "bg-[#FFD9C2]",
    text: "text-[#555647]",
  },
  2: {
    background: "bg-[#FDE0AF]",
    characterAlt: "병아리로 성장한 레벨 2 학습 캐릭터",
    characterImage: "/images/main/edu_progress_chick.png",
    progressGradient: "from-[#F5D564] to-[#E9AE36]",
    progressTrack: "bg-[#EDF098]",
    text: "text-[#644B21]",
  },
  3: {
    background: "bg-[#FDD3C5]",
    characterAlt: "닭으로 성장한 레벨 3 학습 캐릭터",
    characterImage: "/images/main/edu_progress_chicken.png",
    progressGradient: "from-[#FFBE82] to-[#F08C62]",
    progressTrack: "bg-[#FFFAC9]",
    text: "text-[#672F1D]",
  },
};

function clampProgressRate(progressRate: number) {
  return Math.min(100, Math.max(0, progressRate));
}

export default function EduProgress() {
  const { data: myInfo } = useGetMyInfo();
  const isLoggedIn = myInfo?.isLoggedIn === true;
  const userId = isLoggedIn ? myInfo.user.id : null;
  const userLevel = isLoggedIn ? myInfo.user.currentLevel : null;

  const { data: educationSummaries = [] } = useEducationSummariesQuery(userId, {
    enabled: isLoggedIn,
  });

  const progressRate = useMemo(() => {
    const articles = educationSummaries.flatMap((summary) => summary.articles);

    if (articles.length === 0) {
      return 0;
    }

    const totalProgressRate = articles.reduce(
      (total, article) => total + clampProgressRate(article.progressRate),
      0,
    );

    return Math.floor(totalProgressRate / articles.length);
  }, [educationSummaries]);

  const levelTheme = LEVEL_THEMES[userLevel ?? 1] ?? LEVEL_THEMES[1];

  return (
    <section
      className="flex min-w-0 flex-col rounded-2xl bg-white p-5 lg:h-full"
      aria-label="학습 현황"
    >
      <header className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl leading-tight font-bold tracking-[-0.02em] text-(--cs-text-strong)">
          학습 현황
        </h2>
      </header>

      <article
        className={`relative flex h-28 w-full items-center overflow-hidden rounded-xl p-5 ${levelTheme.background}`}
        aria-label={`레벨 ${userLevel} 학습 현황`}
      >
        <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-1">
          <h3 className={`font-semibold ${levelTheme.text}`}>
            레벨 {userLevel}
          </h3>
          <div
            className={`h-2.5 w-full overflow-hidden rounded-full ${levelTheme.progressTrack}`}
            role="progressbar"
            aria-label={`레벨 ${userLevel} 학습 진행률`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressRate}
          >
            <div
              className={`h-full rounded-full bg-linear-to-r ${levelTheme.progressGradient}`}
              style={{ width: `${progressRate}%` }}
            />
          </div>
          <p className={`text-sm font-semibold ${levelTheme.text}`}>
            {progressRate}%
          </p>
        </div>

        <figure className="ml-auto shrink-0">
          <Image
            src={levelTheme.characterImage}
            alt={levelTheme.characterAlt}
            width={120}
            height={120}
            priority
            fetchPriority="high"
          />
        </figure>
      </article>
    </section>
  );
}
