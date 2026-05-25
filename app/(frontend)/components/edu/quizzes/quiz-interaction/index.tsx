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

export default function QuizInteraction({
  quiz,
  userId,
}: QuizInteractionProps) {
  const [shortAnswer, setShortAnswer] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [hasCorrectSubmission, setHasCorrectSubmission] = useState(false);
  const submitAnswer = useSubmitQuizAnswerMutation();
  const answerValue = getAnswerValue(quiz, selectedAnswer, shortAnswer);
  const isAlreadySubmitted =
    answerValue.length > 0 && answerValue === submittedAnswer;
  const canSubmit =
    answerValue.length > 0 &&
    isPositiveIntegerText(userId) &&
    !isAlreadySubmitted &&
    !hasCorrectSubmission;

  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setSubmissionResult(null);
  };

  const handleShortAnswerChange = (answer: string) => {
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
        quizId: quiz.id,
        userAnswer: answerValue,
        userId,
      },
      {
        onSuccess: (result) => {
          setSubmittedAnswer(answerValue);
          setHasCorrectSubmission(result.isCorrect);
          setSubmissionResult({
            answer: result.answer,
            explanation: result.isCorrect
              ? result.explanation
              : "아쉬워요! 다시 한 번 생각해 볼까요?",
            isCorrect: result.isCorrect,
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
      <section className="mx-auto flex w-full max-w-6xl flex-col rounded-3xl bg-white px-16 py-6 text-black shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
        <QuizContent
          quiz={quiz}
          selectedAnswer={selectedAnswer}
          shortAnswer={shortAnswer}
          onSelectAnswer={handleSelectAnswer}
          onShortAnswerChange={handleShortAnswerChange}
        />
      </section>

      <div className="mt-8 flex w-full flex-col items-end gap-4 px-14 text-2xl">
        <button
          type="button"
          className="text-zinc-500 transition hover:text-black disabled:cursor-not-allowed disabled:text-zinc-300"
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
        <Modal.Overlay className="p-0">
          <Modal.Content
            closeButtonClassName="right-5 top-5 size-9 text-zinc-300 hover:bg-transparent hover:text-zinc-400"
            className="h-88 w-162.5 max-w-[calc(100vw-32px)] rounded-lg p-10 shadow-none"
          >
            {submissionResult && (
              <div className="flex h-full flex-col gap-4">
                <h2 className="text-3xl leading-tight font-bold text-black">
                  {submissionResult.isCorrect &&
                    `정답 : ${submissionResult.answer}`}

                  {!submissionResult.isCorrect && "오답"}
                </h2>

                <div className="min-h-0 flex-1 rounded-lg border-2 border-sky-500 px-2 py-2">
                  <p className="text-xl leading-9 whitespace-pre-line text-black">
                    {submissionResult.explanation}
                  </p>
                </div>
              </div>
            )}
          </Modal.Content>
        </Modal.Overlay>
      </Modal.Root>
    </>
  );
}
