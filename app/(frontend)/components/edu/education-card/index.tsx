"use client";

import { useState } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { twMerge } from "tailwind-merge";
import { IconInfoCircle } from "@tabler/icons-react";
import ArticleProgressIcon from "../article-progress-icon";
import Modal from "../../ui/modal";

export type EducationListItem = {
  id?: string;
  level?: string;
  title: string;
  description?: string;
  progressRate?: number;
  isCompleted?: boolean;
};

export type EducationCardData = {
  summary: string[];
  list: EducationListItem[];
};

export type EducationCardProps = {
  level: string;
  title: string;
  image: string | StaticImageData;
  data: EducationCardData;
  className?: string;
  autoOpenList?: boolean;
  priority?: boolean;
};

type OpenPanel = "summary" | "list" | "closed" | null;

function getListItemKey(item: EducationListItem, index: number) {
  return item.id ?? `${item.title}-${index}`;
}

function getVisiblePanel(openPanel: OpenPanel, autoOpenList: boolean) {
  if (openPanel === null && autoOpenList) {
    return "list";
  }

  return openPanel;
}

export default function EducationCard({
  level,
  title,
  image,
  data,
  className,
  autoOpenList = false,
  priority = false,
}: EducationCardProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const hasSummary = data.summary.some((item) => item.trim().length > 0);
  const hasList = data.list.length > 0;
  const visiblePanel = getVisiblePanel(openPanel, autoOpenList);
  const isSummaryPanelVisible = visiblePanel === "summary";
  const isListPanelVisible = visiblePanel === "list";

  const handleModalOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setOpenPanel(visiblePanel);
      return;
    }

    setOpenPanel("closed");
  };

  return (
    <>
      <article
        className={twMerge(
          "relative z-0 h-90 w-full max-w-md overflow-hidden rounded-3xl px-5 pt-5 pb-7 text-black shadow-[0_12px_24px_rgb(0_0_0/0.18),0_4px_8px_rgb(0_0_0/0.12)] transition-transform duration-200 hover:z-50 hover:-translate-y-2 sm:px-8",
          className,
        )}
      >
        <Image
          src={image}
          alt={`${level} ${title}`}
          fill
          className="object-cover"
          priority={priority}
          sizes="(max-width: 768px) 90vw, 448px"
        />

        <div className="relative z-10 flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-2xl leading-none font-medium tracking-normal sm:text-3xl">
              Level {level}
            </p>

            <h2 className="mt-1 truncate text-lg leading-6 font-medium tracking-normal sm:text-xl">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="h-10 shrink-0 cursor-pointer rounded-full bg-[#72327d] px-4 text-lg leading-none font-medium text-white transition-colors hover:bg-[#5f286b] focus-visible:ring-2 focus-visible:ring-[#72327d] focus-visible:ring-offset-2 focus-visible:outline-none sm:h-11 sm:px-5 sm:text-2xl"
            onClick={() => setOpenPanel("list")}
          >
            Play Now
          </button>
        </div>

        <button
          type="button"
          aria-label={`${title} 요약 보기`}
          className="absolute bottom-4 left-5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full text-zinc-700 transition-colors hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:outline-none sm:left-8"
          onClick={() => setOpenPanel("summary")}
        >
          <IconInfoCircle aria-hidden="true" className="size-6" stroke={1.5} />
        </button>
      </article>

      <Modal.Root
        isOpen={isSummaryPanelVisible || isListPanelVisible}
        setIsOpen={handleModalOpenChange}
      >
        <Modal.Overlay>
          <Modal.Content className="w-[min(100%,600px)] rounded-2xl p-6 md:p-7">
            {isSummaryPanelVisible && (
              <section>
                <h3 className="mt-1 text-2xl font-semibold tracking-normal">
                  이런걸 배울 수 있어요
                </h3>

                {hasSummary && (
                  <ul className="mt-6 list-disc space-y-3 pl-7 text-base leading-7 md:mt-8 md:space-y-5 md:pl-11 md:text-xl">
                    {data.summary.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                )}

                {!hasSummary && (
                  <p className="mt-5 rounded-lg bg-zinc-100 px-4 py-5 text-center text-sm text-zinc-500">
                    아직 요약이 준비되지 않았어요.
                  </p>
                )}
              </section>
            )}

            {isListPanelVisible && (
              <section>
                <h3 className="mt-1 text-2xl font-semibold tracking-normal">
                  Level {level} 목록
                </h3>

                {hasList && (
                  <ol className="mt-5 grid">
                    {data.list.map((item, index) => (
                      <li
                        key={getListItemKey(item, index)}
                        className="px-4 py-3"
                      >
                        <div className="flex w-full items-center">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                            {index + 1}.
                          </span>

                          <div className="flex min-w-0 items-center gap-1.5">
                            {!item.id && (
                              <p className="min-w-0 flex-1 truncate text-base md:text-xl">
                                {item.title}
                              </p>
                            )}

                            {item.id && (
                              <Link
                                href={{
                                  pathname: `/edu/articles/${item.id}`,
                                  query: {
                                    level: item.level ?? level,
                                  },
                                }}
                                className="block min-w-0 flex-1 truncate text-base transition-colors hover:text-[#72327d] focus-visible:ring-2 focus-visible:ring-[#72327d] focus-visible:ring-offset-2 focus-visible:outline-none md:text-xl"
                              >
                                {item.title}
                              </Link>
                            )}

                            <ArticleProgressIcon
                              progressRate={item.progressRate}
                              isCompleted={item.isCompleted}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                {!hasList && (
                  <p className="mt-5 rounded-lg bg-zinc-100 px-4 py-5 text-center text-sm text-zinc-500">
                    아직 학습 목록이 준비되지 않았어요.
                  </p>
                )}
              </section>
            )}
          </Modal.Content>
        </Modal.Overlay>
      </Modal.Root>
    </>
  );
}
