import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

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

function selectQuizFields() {
  return {
    id: true,
    educationLevelId: true,
    articleId: true,
    quizType: true,
    question: true,
    description: true,
    optionText: true,
  } as const;
}

type QuizSubmissionRequestBody = {
  user_id?: unknown;
  userId?: unknown;
  quiz_id?: unknown;
  quizId?: unknown;
  user_answer?: unknown;
  userAnswer?: unknown;
  is_skip?: unknown;
  isSkip?: unknown;
};

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

function parseOptionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const articleId = parsePositiveInteger(
      searchParams.get("articleId") ?? searchParams.get("article_id"),
    );
    const userId = parsePositiveBigInt(
      searchParams.get("userId") ?? searchParams.get("user_id"),
    );

    if (
      (searchParams.has("articleId") || searchParams.has("article_id")) &&
      (searchParams.has("userId") || searchParams.has("user_id"))
    ) {
      if (!articleId) {
        return NextResponse.json(
          { ok: false, error: "INVALID_ARTICLE_ID" },
          { status: 400 },
        );
      }

      if (!userId) {
        return NextResponse.json(
          { ok: false, error: "INVALID_USER_ID" },
          { status: 400 },
        );
      }

      const correctSubmission = await prisma.userQuizSubmission.findFirst({
        where: {
          userId,
          isCorrect: true,
          quiz: {
            articleId,
          },
        },
        select: {
          quizId: true,
        },
      });

      return NextResponse.json({
        ok: true,
        data: {
          source: "ARTICLE_PROGRESS",
          isCorrect: Boolean(correctSubmission),
        },
      });
    }

    if (searchParams.has("articleId") || searchParams.has("article_id")) {
      if (!articleId) {
        return NextResponse.json(
          { ok: false, error: "INVALID_ARTICLE_ID" },
          { status: 400 },
        );
      }

      const quizzes = await prisma.quiz.findMany({
        where: { articleId },
        orderBy: { id: "asc" },
        select: selectQuizFields(),
      });

      return NextResponse.json({
        ok: true,
        data: {
          source: "ARTICLE",
          quizzes,
        },
      });
    }

    if (searchParams.has("userId") || searchParams.has("user_id")) {
      if (!userId) {
        return NextResponse.json(
          { ok: false, error: "INVALID_USER_ID" },
          { status: 400 },
        );
      }

      const skippedSubmissions = await prisma.userQuizSubmission.findMany({
        where: {
          userId,
          isSkip: true,
        },
        orderBy: { answeredAt: "asc" },
        select: {
          quiz: {
            select: selectQuizFields(),
          },
        },
      });

      if (skippedSubmissions.length > 0) {
        return NextResponse.json({
          ok: true,
          data: {
            source: "SKIPPED",
            quizzes: skippedSubmissions.map((submission) => submission.quiz),
          },
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          currentLevel: true,
          currentStep: true,
        },
      });

      if (!user) {
        return NextResponse.json(
          { ok: false, error: "USER_NOT_FOUND" },
          { status: 404 },
        );
      }

      if (!user.currentLevel || !user.currentStep) {
        return NextResponse.json(
          { ok: false, error: "USER_PROGRESS_NOT_FOUND" },
          { status: 404 },
        );
      }

      const quizzes = await prisma.quiz.findMany({
        where: {
          educationLevelId: user.currentLevel,
          articleId: user.currentStep,
        },
        orderBy: { id: "asc" },
        select: selectQuizFields(),
      });

      return NextResponse.json({
        ok: true,
        data: {
          source: "CURRENT_STEP",
          currentLevel: user.currentLevel,
          currentStep: user.currentStep,
          quizzes,
        },
      });
    }

    return NextResponse.json(
      { ok: false, error: "QUIZ_QUERY_REQUIRED" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "QUIZ_FETCH_FAILED"
        : error instanceof Error
        ? error.message
        : "QUIZ_FETCH_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuizSubmissionRequestBody;
    const userId = parseRequiredPositiveBigInt(body.user_id ?? body.userId);
    const quizId = parseRequiredPositiveInteger(body.quiz_id ?? body.quizId);
    const userAnswerValue = body.user_answer ?? body.userAnswer;
    const isSkipValue = body.is_skip ?? body.isSkip;
    const hasUserAnswer =
      typeof userAnswerValue === "string" && userAnswerValue.length > 0;
    const hasIsSkip = isSkipValue !== undefined && isSkipValue !== null;
    const isSkip = hasIsSkip ? parseOptionalBoolean(isSkipValue) : false;

    if (!userId || !quizId) {
      return NextResponse.json(
        { ok: false, error: "INVALID_QUIZ_SUBMISSION_QUERY" },
        { status: 400 },
      );
    }

    if (!hasUserAnswer && !hasIsSkip) {
      return NextResponse.json(
        { ok: false, error: "QUIZ_ANSWER_OR_SKIP_REQUIRED" },
        { status: 400 },
      );
    }

    if (hasIsSkip && isSkip === null) {
      return NextResponse.json(
        { ok: false, error: "INVALID_IS_SKIP" },
        { status: 400 },
      );
    }

    if (hasUserAnswer && isSkip === true) {
      return NextResponse.json(
        { ok: false, error: "ANSWER_AND_SKIP_CONFLICT" },
        { status: 400 },
      );
    }

    if (!hasUserAnswer && isSkip !== true) {
      return NextResponse.json(
        { ok: false, error: "QUIZ_ANSWER_OR_SKIP_REQUIRED" },
        { status: 400 },
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        answer: true,
        explanation: true,
      },
    });

    if (!quiz) {
      return NextResponse.json(
        { ok: false, error: "QUIZ_NOT_FOUND" },
        { status: 404 },
      );
    }

    const selectedAnswer = hasUserAnswer ? userAnswerValue : "";
    const isCorrect = hasUserAnswer && selectedAnswer === quiz.answer;
    const existingSubmission = await prisma.userQuizSubmission.findUnique({
      where: {
        userId_quizId: {
          userId,
          quizId,
        },
      },
      select: {
        selectedAnswer: true,
        isCorrect: true,
        isSkip: true,
        answeredAt: true,
      },
    });
    const alreadyCorrect = existingSubmission?.isCorrect === true;
    const nextSelectedAnswer = alreadyCorrect
      ? existingSubmission.selectedAnswer
      : selectedAnswer;
    const nextIsSkip = alreadyCorrect
      ? existingSubmission.isSkip
      : (isSkip ?? false);
    const nextIsCorrect = alreadyCorrect || isCorrect;
    const nextAnsweredAt =
      existingSubmission?.answeredAt ?? (isCorrect ? new Date() : null);

    const submission = await prisma.userQuizSubmission.upsert({
      where: {
        userId_quizId: {
          userId,
          quizId,
        },
      },
      create: {
        userId,
        quizId,
        selectedAnswer,
        isSkip: isSkip ?? false,
        isCorrect,
        answeredAt: isCorrect ? new Date() : null,
      },
      update: {
        selectedAnswer: nextSelectedAnswer,
        isSkip: nextIsSkip,
        isCorrect: nextIsCorrect,
        answeredAt: nextAnsweredAt,
      },
      select: {
        isCorrect: true,
        isSkip: true,
      },
    });

    if (hasUserAnswer) {
      return NextResponse.json({
        ok: true,
        data: {
          answer: quiz.answer,
          isCorrect: submission.isCorrect,
          explanation: quiz.explanation,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        isSkip: submission.isSkip,
      },
    });
  } catch (error) {
    const message =
      process.env.NODE_ENV === "production"
        ? "QUIZ_SUBMISSION_FAILED"
        : error instanceof Error
        ? error.message
        : "QUIZ_SUBMISSION_FAILED";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
