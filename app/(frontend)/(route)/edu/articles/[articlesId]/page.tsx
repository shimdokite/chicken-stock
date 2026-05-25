import Link from "next/link";
import Image from "next/image";
import { IconChevronLeft } from "@tabler/icons-react";
import { getEducationArticle } from "@/app/(frontend)/apis/edu/queries";
import { getArticleQuizProgress } from "@/app/(frontend)/apis/edu/quizzes/queries";
import { getRequestOrigin } from "../../../../lib/server/request";
import { parseArticleContent } from "../../../../utils/edu/article-content";
import { isPositiveIntegerString } from "../../../../utils/number";
import ArticleProgressTracker from "../../../../components/edu/article-progress-tracker";
import ArticleMessage from "../../../../components/edu/article-message";

type ArticlePageProps = {
  params: Promise<{
    articlesId: string;
  }>;
  searchParams: Promise<{
    level?: string;
    userId?: string;
    user_id?: string;
  }>;
};

const READING_CHARACTERS_PER_MINUTE = 400;
const ARTICLE_PROGRESS_TARGET_ID = "article-progress-content";

function getVisibleContentBlocks(
  contentBlocks: ReturnType<typeof parseArticleContent>,
) {
  if (contentBlocks[0]?.type === "heading" && contentBlocks[0].level === 1) {
    return contentBlocks.slice(1);
  }

  return contentBlocks;
}

function getContentTextLength(
  contentBlocks: ReturnType<typeof parseArticleContent>,
) {
  return contentBlocks.reduce((totalLength, block) => {
    if (block.type === "list") {
      return (
        totalLength +
        block.items.reduce(
          (listTextLength, item) =>
            listTextLength + item.replace(/\s/g, "").length,
          0,
        )
      );
    }

    if (block.type === "divider") {
      return totalLength;
    }

    return totalLength + block.text.replace(/\s/g, "").length;
  }, 0);
}

function calculateEstimatedReadingMinutes(
  contentBlocks: ReturnType<typeof parseArticleContent>,
) {
  const contentTextLength = getContentTextLength(contentBlocks);

  return Math.max(
    1,
    Math.round(contentTextLength / READING_CHARACTERS_PER_MINUTE),
  );
}

function getHeadingClassName(level: number) {
  if (level === 1) {
    return "text-4xl leading-tight font-bold text-zinc-950";
  }

  if (level === 2) {
    return "pt-6 text-3xl leading-tight font-bold text-zinc-950";
  }

  return "pt-3 text-2xl leading-tight font-semibold text-zinc-950";
}

export default async function ArticlePage({
  params,
  searchParams,
}: ArticlePageProps) {
  const { articlesId } = await params;
  const { level, userId, user_id } = await searchParams;
  const currentUserId = userId ?? user_id;
  let currentUserIdParam: string | null = null;

  if (
    typeof currentUserId === "string" &&
    isPositiveIntegerString(currentUserId)
  ) {
    currentUserIdParam = currentUserId;
  }

  if (!isPositiveIntegerString(articlesId) || !isPositiveIntegerString(level)) {
    return (
      <ArticleMessage
        title="학습 글을 찾을 수 없어요"
        message="선택한 학습 단계나 글 정보가 올바르지 않아요."
      />
    );
  }

  const articleLevel = level ?? "";
  const requestOrigin = await getRequestOrigin();
  const article = await getEducationArticle(
    articlesId,
    articleLevel,
    requestOrigin,
  );

  if (!article) {
    return (
      <ArticleMessage
        title="학습 글을 불러오지 못했어요"
        message="선택한 학습 글이 없거나 일시적으로 조회할 수 없어요."
      />
    );
  }

  const contentBlocks = parseArticleContent(article.content);
  const visibleContentBlocks = getVisibleContentBlocks(contentBlocks);
  const estimatedReadingMinutes =
    calculateEstimatedReadingMinutes(visibleContentBlocks);
  let quizProgress: Awaited<ReturnType<typeof getArticleQuizProgress>> | null =
    null;

  if (currentUserIdParam) {
    quizProgress = await getArticleQuizProgress(
      articlesId,
      currentUserIdParam,
      requestOrigin,
    );
  }

  const isQuizCompleted = quizProgress?.isCorrect === true;
  const quizLinkQuery: { level: string; userId?: string } = {
    level: articleLevel,
  };
  const articleListLinkQuery: { openLevel: string; userId?: string } = {
    openLevel: String(article.educationSummary.stage),
  };

  if (currentUserIdParam) {
    quizLinkQuery.userId = currentUserIdParam;
    articleListLinkQuery.userId = currentUserIdParam;
  }

  return (
    <main className="relative min-h-[calc(100dvh-74px)] bg-white px-5 pt-36 pb-20 text-zinc-950">
      <ArticleProgressTracker
        articleId={articlesId}
        targetId={ARTICLE_PROGRESS_TARGET_ID}
        userId={currentUserIdParam}
      />

      <Link
        href={{
          pathname: "/edu",
          query: articleListLinkQuery,
        }}
        aria-label="학습 목록으로 돌아가기"
        className="absolute top-20 left-6 flex size-16 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:outline-none md:top-24 md:left-20"
      >
        <IconChevronLeft aria-hidden="true" className="size-16" stroke={1.8} />
      </Link>

      <article className="mx-auto max-w-4xl">
        <h1 className="text-center text-4xl leading-tight font-bold tracking-normal md:text-5xl">
          {article.title}
        </h1>

        <div className="mt-5 text-left text-lg font-semibold text-zinc-500 md:text-xl">
          예상 읽기 시간 : {estimatedReadingMinutes}분
        </div>

        {article.imageUrl && (
          <div className="relative mx-auto mt-14 h-72 w-full max-w-md overflow-hidden rounded-xl bg-zinc-100">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              unoptimized
            />
          </div>
        )}

        {visibleContentBlocks.length > 0 && (
          <div
            id={ARTICLE_PROGRESS_TARGET_ID}
            className="mx-auto mt-14 max-w-4xl space-y-8 text-zinc-950"
          >
            {visibleContentBlocks.map((block, index) => {
              if (block.type === "heading") {
                const headingClassName = getHeadingClassName(block.level);

                const HeadingTag = `h${block.level}` as const;

                return (
                  <HeadingTag
                    key={`${block.text}-${index}`}
                    className={headingClassName}
                  >
                    {block.text}
                  </HeadingTag>
                );
              }

              if (block.type === "list") {
                return (
                  <ul
                    key={`list-${index}`}
                    className="list-disc space-y-3 pl-8 text-2xl leading-10 md:text-3xl md:leading-relaxed"
                  >
                    {block.items.map((item, itemIndex) => (
                      <li key={`${item}-${itemIndex}`}>{item}</li>
                    ))}
                  </ul>
                );
              }

              if (block.type === "quote") {
                return (
                  <blockquote
                    key={`${block.text}-${index}`}
                    className="border-l-4 border-zinc-300 px-6 py-2 text-2xl leading-10 font-medium text-zinc-950 md:text-3xl md:leading-relaxed"
                  >
                    {block.text}
                  </blockquote>
                );
              }

              if (block.type === "divider") {
                return (
                  <hr key={`divider-${index}`} className="border-zinc-300" />
                );
              }

              return (
                <p
                  key={`${block.text}-${index}`}
                  className="text-2xl leading-10 md:text-3xl md:leading-relaxed"
                >
                  {block.text}
                </p>
              );
            })}
          </div>
        )}

        {visibleContentBlocks.length === 0 && (
          <p className="mt-8 rounded-lg bg-white px-5 py-6 text-center text-base text-zinc-500 shadow-sm">
            아직 본문이 준비되지 않았어요.
          </p>
        )}

        <div className="mt-16 flex justify-center">
          {isQuizCompleted && (
            <button
              type="button"
              className="inline-flex min-h-14 cursor-not-allowed items-center justify-center rounded-lg bg-zinc-300 px-10 text-2xl font-semibold text-zinc-500"
              disabled
            >
              퀴즈 완료
            </button>
          )}

          {!isQuizCompleted && (
            <Link
              href={{
                pathname: `/edu/quizzes/${articlesId}`,
                query: quizLinkQuery,
              }}
              className="inline-flex min-h-14 items-center justify-center rounded-lg bg-zinc-950 px-10 text-2xl font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              퀴즈 풀러 가기
            </Link>
          )}
        </div>
      </article>
    </main>
  );
}
