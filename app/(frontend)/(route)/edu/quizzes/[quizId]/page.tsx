import { getCachedEducationArticle } from "@/app/(backend)/lib/education";
import { getArticleQuizzes } from "@/app/(backend)/lib/quizzes";
import AuthRequiredRedirect from "@/app/(frontend)/components/auth-guard/auth-required-redirect";
import { getCurrentUser } from "../../../../lib/auth-check";
import { isPositiveIntegerString } from "../../../../utils/number";
import QuizContainer from "@/app/(frontend)/components/edu/quizzes/quiz-container";
import type { QuizContentData } from "@/app/(frontend)/components/edu/quizzes/quiz-content";
import { createCanonicalUrl, SITE_NAME } from "../../seo";

type QuizPageProps = {
  params: Promise<{
    quizId: string;
  }>;
  searchParams: Promise<{
    level?: string;
  }>;
};

type QuizArticleContextData = {
  id: number;
  title: string;
  educationSummary: {
    stage: number;
  };
};

async function getQuizArticleContext(quizId: string, level?: string) {
  const parsedArticleId = Number(quizId);
  let articleId = parsedArticleId;
  let levelParam: string | null = null;
  let article: QuizArticleContextData | null = null;

  if (Number.isNaN(parsedArticleId)) {
    articleId = 1;
  }

  if (typeof level === "string" && isPositiveIntegerString(level)) {
    levelParam = level;
  }

  if (isPositiveIntegerString(quizId) && levelParam) {
    article = await getCachedEducationArticle(articleId, Number(levelParam));
  }

  return {
    articleId,
    label: {
      level: article?.educationSummary.stage ?? levelParam ?? "-",
      id: article?.id,
      title: article?.title ?? "학습 주제",
    },
  };
}

function getQuizSeoTitle(articleTitle: string, level?: string | null) {
  return level
    ? `${articleTitle} 퀴즈 - Level ${level} | Chicken Stock`
    : `${articleTitle} 퀴즈 | 주식 투자 퀴즈 | Chicken Stock`;
}

function getQuizSeoDescription(articleTitle: string) {
  return `${articleTitle} 개념을 이해했는지 퀴즈로 확인하고, Chicken Stock에서 주식 투자 지식을 단계별로 학습해보세요.`;
}

export default async function QuizPage({
  params,
  searchParams,
}: QuizPageProps) {
  const { quizId } = await params;
  const { level } = await searchParams;
  const [currentUser, articleContext] = await Promise.all([
    getCurrentUser(),
    getQuizArticleContext(quizId, level),
  ]);

  if (!currentUser) {
    return <AuthRequiredRedirect />;
  }

  const currentUserId = String(currentUser.id);
  const { articleId, label } = articleContext;
  const initialQuizzes: QuizContentData[] = await getArticleQuizzes(
    articleId,
    currentUser.id,
  );
  const quizTitle = getQuizSeoTitle(label.title, level);
  const quizDescription = getQuizSeoDescription(label.title);
  const canonicalUrl = createCanonicalUrl(`/edu/quizzes/${articleId}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: quizTitle,
    description: quizDescription,
    url: canonicalUrl,
    learningResourceType: "Quiz",
    educationalLevel: level ? `Level ${level}` : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };

  return (
    <main className="min-h-[calc(100dvh-74px)] bg-[#f8f8f9] px-5 pt-8 pb-8 text-black md:px-8 md:pt-12 md:pb-12 lg:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="mx-auto w-full max-w-4xl">
        <section className="rounded-2xl bg-white p-5 md:p-8 lg:p-10">
          <p className="inline-flex rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900 md:text-base">
            Level {label.level} | {label.id}. {label.title}
          </p>

          <div className="mt-6 md:mt-8">
            <QuizContainer
              articleId={articleId}
              initialQuizzes={initialQuizzes}
              userId={currentUserId}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
