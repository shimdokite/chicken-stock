import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

type ArticleCompletionRequestBody = {
  user_id?: unknown;
  userId?: unknown;
  article_id?: unknown;
  articleId?: unknown;
  progress_rate?: unknown;
  progressRate?: unknown;
};

function parsePositiveInteger(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

function parsePositiveBigInt(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsedValue = BigInt(value);

  if (parsedValue <= BigInt(0)) {
    return null;
  }

  return parsedValue;
}

function parseRequiredPositiveInteger(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  return parsePositiveInteger(String(value));
}

function parseRequiredPositiveBigInt(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  return parsePositiveBigInt(String(value));
}

function parseProgressRate(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.floor(parsedValue)));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const articleId = parsePositiveInteger(searchParams.get("id"));
    const level = parsePositiveInteger(searchParams.get("level"));
    const userId = parsePositiveBigInt(
      searchParams.get("userId") ?? searchParams.get("user_id"),
    );
    const educationSummaryId = parsePositiveInteger(
      searchParams.get("education_summary_id") ??
        searchParams.get("educationSummaryId"),
    );

    if (
      searchParams.has("id") ||
      searchParams.has("level") ||
      searchParams.has("education_summary_id") ||
      searchParams.has("educationSummaryId")
    ) {
      if (!articleId || (!educationSummaryId && !level)) {
        return NextResponse.json(
          {
            ok: false,
            error: "INVALID_ARTICLE_QUERY",
          },
          { status: 400 },
        );
      }

      const articleLevel = level ?? 0;

      const article = await prisma.article.findFirst({
        where: {
          id: articleId,
          ...(educationSummaryId
            ? { educationSummaryId }
            : {
                educationSummary: {
                  stage: articleLevel,
                },
              }),
        },
        select: {
          id: true,
          educationSummaryId: true,
          title: true,
          content: true,
          imageUrl: true,
          sortOrder: true,
          educationSummary: {
            select: {
              stage: true,
              title: true,
            },
          },
        },
      });

      if (!article) {
        return NextResponse.json(
          {
            ok: false,
            error: "ARTICLE_NOT_FOUND",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        data: article,
      });
    }

    const educationSummaries = await prisma.educationSummary.findMany({
      orderBy: { stage: "asc" },
      select: {
        id: true,
        title: true,
        stage: true,
        summary: true,
        articles: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            title: true,
            sortOrder: true,
            completions: {
              where: userId ? { userId } : { userId: BigInt(0) },
              select: {
                progressRate: true,
                isCompleted: true,
              },
            },
          },
        },
      },
    });

    const educationSummariesWithArticleProgress = educationSummaries.map(
      (summary) => ({
        ...summary,
        articles: summary.articles.map((article) => {
          const completion = article.completions[0];

          return {
            id: article.id,
            title: article.title,
            sortOrder: article.sortOrder,
            progressRate: completion?.progressRate ?? 0,
            isCompleted: completion?.isCompleted ?? false,
          };
        }),
      }),
    );

    return NextResponse.json({
      ok: true,
      data: educationSummariesWithArticleProgress,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "EDUCATION_CONTENT_FETCH_FAILED"
        : error instanceof Error
        ? error.message
        : "EDUCATION_CONTENT_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ArticleCompletionRequestBody;
    const userId = parseRequiredPositiveBigInt(body.user_id ?? body.userId);
    const articleId = parseRequiredPositiveInteger(
      body.article_id ?? body.articleId,
    );
    const progressRate = parseProgressRate(
      body.progress_rate ?? body.progressRate,
    );

    if (!userId || !articleId || progressRate === null) {
      return NextResponse.json(
        { ok: false, error: "INVALID_ARTICLE_COMPLETION_QUERY" },
        { status: 400 },
      );
    }

    const existingCompletion = await prisma.userArticleCompletion.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
      select: {
        progressRate: true,
        isCompleted: true,
        completedAt: true,
      },
    });

    const nextProgressRate = Math.max(
      existingCompletion?.progressRate ?? 0,
      progressRate,
    );
    const nextIsCompleted =
      existingCompletion?.isCompleted === true || nextProgressRate >= 90;
    const nextCompletedAt =
      existingCompletion?.completedAt ??
      (nextIsCompleted ? new Date() : null);

    const completion = await prisma.userArticleCompletion.upsert({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
      create: {
        userId,
        articleId,
        progressRate: nextProgressRate,
        isCompleted: nextIsCompleted,
        completedAt: nextCompletedAt,
      },
      update: {
        progressRate: nextProgressRate,
        isCompleted: nextIsCompleted,
        completedAt: nextCompletedAt,
      },
      select: {
        progressRate: true,
        isCompleted: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: completion,
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "ARTICLE_COMPLETION_SAVE_FAILED"
        : error instanceof Error
        ? error.message
        : "ARTICLE_COMPLETION_SAVE_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
