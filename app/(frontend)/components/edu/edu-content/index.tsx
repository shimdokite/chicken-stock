"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useGetMyInfo } from "../../../apis/auth/queries";
import { useEducationSummariesQuery } from "../../../apis/edu/queries";
import EducationCard from "../education-card";

const educationCardStyles = [
  {
    image: "/images/edu/egg.png",
    className:
      "md:absolute md:top-96 md:left-0 md:z-10 md:h-[359px] md:w-[440px] md:max-w-[500px]",
  },
  {
    image: "/images/edu/chick.png",
    className:
      "md:absolute md:top-[31rem] md:left-1/2 md:z-30 md:h-[359px] md:w-[440px] md:max-w-[500px] md:-translate-x-1/2",
  },
  {
    image: "/images/edu/chicken.png",
    className:
      "md:absolute md:top-96 md:right-0 md:z-10 md:h-[359px] md:w-[440px] md:max-w-[500px]",
  },
] as const;

export default function EduContent() {
  const searchParams = useSearchParams();
  const openLevel = searchParams.get("openLevel");
  const searchParamUserId =
    searchParams.get("userId") ?? searchParams.get("user_id");
  const { data: myInfo, isLoading: isMyInfoLoading } = useGetMyInfo();
  const userId =
    searchParamUserId ?? (myInfo?.isLoggedIn ? myInfo.user.id : null);

  const {
    data: educationSummaries = [],
    isError,
    isLoading: isEducationLoading,
  } = useEducationSummariesQuery(userId);

  const educationCards = useMemo(
    () =>
      educationSummaries.map((summary, index) => ({
        level: String(summary.stage),
        title: summary.title,
        image:
          educationCardStyles[index]?.image ?? educationCardStyles[0].image,
        className: educationCardStyles[index]?.className,
        data: {
          summary: summary.summary,
          list: summary.articles.map((article) => ({
            id: String(article.id),
            level: String(summary.stage),
            title: article.title,
            progressRate: article.progressRate,
            isCompleted: article.isCompleted,
            userId: userId ?? undefined,
          })),
        },
      })),
    [educationSummaries, userId],
  );

  const isLoading = isMyInfoLoading || isEducationLoading;
  const hasEducationCards = educationCards.length > 0;
  const isEmpty = !isLoading && !isError && !hasEducationCards;
  const shouldShowCards = !isLoading && !isError && hasEducationCards;

  return (
    <main
      className="min-h-[calc(100dvh-74px)] overflow-hidden bg-cover bg-center bg-no-repeat px-5"
      style={{ backgroundImage: "url('/images/edu/edu_background.png')" }}
    >
      <section className="relative mx-auto flex min-h-[calc(100dvh-74px)] w-full max-w-7xl flex-col items-center gap-8 pt-16 pb-12 md:block md:min-h-237.5 md:pt-32">
        <div className="mx-auto max-w-5xl text-center text-black">
          <h1 className="text-5xl leading-tight font-bold tracking-normal md:text-8xl">
            레벨별로 학습해보세요!
          </h1>
          <p className="mt-4 text-2xl leading-tight font-medium tracking-normal md:text-4xl">
            학습하고 퀴즈 맞혀 크레딧을 얻어보세요
          </p>
        </div>

        <div className="mt-12 flex w-full flex-col items-center gap-8 md:mt-0">
          {isLoading && (
            <p className="mt-3 rounded-lg bg-white/90 px-5 py-4 text-center text-base font-medium text-zinc-700 shadow-sm">
              학습 데이터를 불러오고 있어요.
            </p>
          )}

          {isError && (
            <p className="mt-3 rounded-lg bg-white/90 px-5 py-4 text-center text-base font-medium text-zinc-700 shadow-sm">
              학습 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.
            </p>
          )}

          {shouldShowCards &&
            educationCards.map((card) => (
              <EducationCard
                key={`${card.level}-${openLevel === card.level ? "open" : "idle"}`}
                level={card.level}
                title={card.title}
                image={card.image}
                data={card.data}
                className={card.className}
                autoOpenList={openLevel === card.level}
              />
            ))}

          {isEmpty && (
            <p className="mt-3 rounded-lg bg-white/90 px-5 py-4 text-center text-base font-medium text-zinc-700 shadow-sm">
              아직 준비된 학습 데이터가 없어요.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
