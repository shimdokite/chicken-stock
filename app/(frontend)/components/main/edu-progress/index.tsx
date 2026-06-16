"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useGetMyInfo } from "../../../apis/auth/queries";
import { useEducationSummariesQuery } from "../../../apis/edu/queries";

function clampProgressRate(progressRate: number) {
  return Math.min(100, Math.max(0, progressRate));
}

function getCharacterImages() {
  return {
    nest: "/images/main/nest.svg",
    egg: "/images/main/egg.svg",
  };
}

export default function EduProgress() {
  const characterImages = getCharacterImages();
  const { data: myInfo, isLoading: isMyInfoLoading } = useGetMyInfo();
  const isLoggedIn = myInfo?.isLoggedIn === true;
  const userId = isLoggedIn ? myInfo.user.id : null;
  const userLevel = isLoggedIn ? myInfo.user.currentLevel : null;

  const { data: educationSummaries = [], isLoading: isEducationLoading } =
    useEducationSummariesQuery(userId);

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

  const guestBubbleText =
    !isMyInfoLoading && !isLoggedIn && "가입하고 주식 공부를 시작해보세요!";

  const progressBubbleText =
    isLoggedIn && !isEducationLoading && `진행중 ${progressRate}%`;

  const bubbleText = guestBubbleText || progressBubbleText || null;

  return (
    <section className="w-full">
      <h2 className="mb-5 text-2xl font-semibold tracking-normal text-zinc-950">
        학습 현황
      </h2>

      <div className="relative aspect-[2.5] overflow-hidden rounded-2xl">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[-35%] h-[200%]"
        >
          <Image
            src="/images/main/edu-progress.webp"
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 768px) calc(100vw - 80px), 50vw"
            className="object-fill brightness-95 saturate-115"
          />
        </div>

        <div className="absolute inset-x-0 bottom-8 flex justify-center md:bottom-12">
          <div className="relative h-44 w-56 md:h-60 md:w-72">
            <Image
              src={characterImages.nest}
              alt=""
              width={172}
              height={110}
              className="absolute bottom-0 left-1/2 w-44 -translate-x-1/2 md:w-56"
              unoptimized
            />

            <Image
              src={characterImages.egg}
              alt={userLevel ? `Level ${userLevel} 학습 캐릭터` : "학습 캐릭터"}
              width={119}
              height={145}
              className="absolute bottom-12 left-1/2 w-28 -translate-x-1/2 md:bottom-16 md:w-40"
              unoptimized
            />
          </div>
        </div>

        {bubbleText && (
          <div className="absolute top-[11%] left-[58%] h-20 w-20 md:h-28 md:w-32">
            <Image
              src="/images/main/rounded-speech-bubble.webp"
              alt=""
              fill
              sizes="192px"
              className="object-contain"
              unoptimized
            />

            <p className="absolute top-[43%] left-[50%] w-[66%] -translate-x-1/2 -translate-y-1/2 text-center text-xs leading-snug font-semibold text-zinc-950 md:text-sm">
              {bubbleText}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
