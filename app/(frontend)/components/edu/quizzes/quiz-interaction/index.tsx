"use client";

import { useState } from "react";
import { useSubmitQuizAnswerMutation } from "@/app/(frontend)/apis/edu/quizzes/mutations";
import Modal from "../../../ui/modal";
import QuizContent, { type QuizContentData } from "../quiz-content";

type QuizInteractionProps = {
  quiz: QuizContentData;
  userId?: string;
};

type SubmissionResult = {
  answer: string;
  explanation: string;
  isCorrect?: boolean;
  isRewardPaid?: boolean;
  rewardAmountKrw?: number;
};

function isPositiveIntegerText(value?: string) {
  return typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0;
}

function getAnswerValue(
  quiz: QuizContentData,
  selectedAnswer: string,
  shortAnswer: string,
) {
  if (quiz.quizType === "SHORT_ANSWER") {
    return shortAnswer.trim();
  }

  return selectedAnswer;
}

function getSubmitButtonLabel(
  isPending: boolean,
  hasCorrectSubmission: boolean,
  isAlreadySubmitted: boolean,
) {
  if (isPending) {
    return "확인 중";
  }

  if (hasCorrectSubmission || isAlreadySubmitted) {
    return "제출 완료";
  }

  return "확인";
}

function getInitialAnswerState(quiz: QuizContentData) {
  const submittedAnswer = quiz.submission?.selectedAnswer ?? "";

  if (quiz.quizType === "SHORT_ANSWER") {
    return {
      selectedAnswer: "",
      shortAnswer: submittedAnswer,
      submittedAnswer,
    };
  }

  return {
    selectedAnswer: submittedAnswer,
    shortAnswer: "",
    submittedAnswer,
  };
}

function formatRewardAmount(value: number) {
  return value.toLocaleString("ko-KR");
}

export default function QuizInteraction({
  quiz,
  userId,
}: QuizInteractionProps) {
  const initialAnswerState = getInitialAnswerState(quiz);
  const [shortAnswer, setShortAnswer] = useState(
    initialAnswerState.shortAnswer,
  );
  const [selectedAnswer, setSelectedAnswer] = useState(
    initialAnswerState.selectedAnswer,
  );
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState(
    initialAnswerState.submittedAnswer,
  );
  const [hasCorrectSubmission, setHasCorrectSubmission] = useState(
    quiz.submission?.isCorrect === true,
  );
  const submitAnswer = useSubmitQuizAnswerMutation();
  const answerValue = getAnswerValue(quiz, selectedAnswer, shortAnswer);
  const isAlreadySubmitted =
    hasCorrectSubmission &&
    answerValue.length > 0 &&
    answerValue === submittedAnswer;
  const canSubmit =
    answerValue.length > 0 &&
    isPositiveIntegerText(userId) &&
    !isAlreadySubmitted &&
    !hasCorrectSubmission;
  const isAnswerLocked = hasCorrectSubmission || submitAnswer.isPending;

  const handleSelectAnswer = (answer: string) => {
    if (isAnswerLocked) {
      return;
    }

    setSelectedAnswer(answer);
    setSubmissionResult(null);
  };

  const handleShortAnswerChange = (answer: string) => {
    if (isAnswerLocked) {
      return;
    }

    setShortAnswer(answer);
    setSubmissionResult(null);
  };

  const handleSubmit = () => {
    if (!userId || !canSubmit) {
      return;
    }

    setSubmissionResult(null);
    submitAnswer.mutate(
      {
        articleId: quiz.articleId,
        quizId: quiz.id,
        userAnswer: answerValue,
        userId,
      },
      {
        onSuccess: (result) => {
          setSubmittedAnswer(result.selectedAnswer);
          setHasCorrectSubmission(result.isCorrect);
          setSubmissionResult({
            answer: result.answer,
            explanation: result.isCorrect
              ? result.explanation
              : "아쉬워요! 다시 한 번 생각해 볼까요?",
            isCorrect: result.isCorrect,
            isRewardPaid: result.isRewardPaid,
            rewardAmountKrw: result.rewardAmountKrw,
          });
          setIsResultModalOpen(true);
        },
        onError: (error) => {
          let explanation = "잠시 후 다시 시도해 주세요.";

          if (error instanceof Error) {
            explanation = error.message;
          }

          setSubmissionResult({
            answer: "제출 실패",
            explanation,
          });
          setIsResultModalOpen(true);
        },
      },
    );
  };

  return (
    <>
      <section className="flex w-full flex-col text-black">
        <QuizContent
          quiz={quiz}
          selectedAnswer={selectedAnswer}
          shortAnswer={shortAnswer}
          isAnswerLocked={isAnswerLocked}
          onSelectAnswer={handleSelectAnswer}
          onShortAnswerChange={handleShortAnswerChange}
        />
      </section>

      <div className="mt-5 flex w-full flex-col items-end gap-3 md:mt-6">
        <button
          type="button"
          className="min-h-11 min-w-24 rounded-lg bg-zinc-900 px-6 text-base font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
          disabled={!canSubmit || submitAnswer.isPending}
          onClick={handleSubmit}
        >
          {getSubmitButtonLabel(
            submitAnswer.isPending,
            hasCorrectSubmission,
            isAlreadySubmitted,
          )}
        </button>

        {!isPositiveIntegerText(userId) && (
          <p className="text-base font-medium text-rose-600">
            사용자 정보가 없어 답안을 제출할 수 없어요.
          </p>
        )}
      </div>

      <Modal.Root isOpen={isResultModalOpen} setIsOpen={setIsResultModalOpen}>
        <Modal.Overlay>
          <Modal.Content
            closeButtonClassName="top-4 right-4 size-9 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            className="w-full max-w-lg rounded-2xl p-6 md:p-8"
          >
            {submissionResult && (
              <div className="flex flex-col gap-4">
                <h2 className="pr-10 text-2xl leading-tight font-bold text-black">
                  {submissionResult.isCorrect &&
                    `정답 : ${submissionResult.answer}`}

                  {!submissionResult.isCorrect && "오답"}
                </h2>

                <div className="rounded-xl bg-zinc-50 p-4 md:p-5">
                  <p className="text-base leading-7 whitespace-pre-line text-black md:text-lg md:leading-8">
                    {submissionResult.explanation}
                  </p>

                  {submissionResult.isCorrect &&
                    submissionResult.isRewardPaid &&
                    submissionResult.rewardAmountKrw !== undefined && (
                      <p className="mt-4 text-base leading-7 font-bold text-sky-700 md:text-lg md:leading-8">
                        보상으로{" "}
                        {formatRewardAmount(submissionResult.rewardAmountKrw)}
                        원이 지급되었어요.
                      </p>
                    )}
                </div>
              </div>
            )}
          </Modal.Content>
        </Modal.Overlay>
      </Modal.Root>
    </>
  );
}
