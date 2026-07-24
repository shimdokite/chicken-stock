"use client";

import QuizAnswerField, { type QuizType } from "../quiz-answer-field";

export type QuizSubmissionData = {
  answeredAt: string | null;
  isCorrect: boolean;
  isSkip: boolean;
  selectedAnswer: string;
};

export type QuizContentData = {
  id: number;
  educationLevelId: number;
  articleId: number;
  question: string;
  description: string;
  quizType: QuizType;
  optionText: string[];
  submission?: QuizSubmissionData | null;
};

type QuizContentProps = {
  quiz: QuizContentData;
  selectedAnswer: string;
  shortAnswer: string;
  isAnswerLocked?: boolean;
  onSelectAnswer: (answer: string) => void;
  onShortAnswerChange: (answer: string) => void;
};

export default function QuizContent({
  quiz,
  selectedAnswer,
  shortAnswer,
  isAnswerLocked = false,
  onSelectAnswer,
  onShortAnswerChange,
}: QuizContentProps) {
  const descriptionLines = quiz.description.split("\n");

  return (
    <>
      <h1 className="mb-4 text-xl leading-snug font-bold md:mb-5 md:text-2xl">
        <span className="mr-2 text-zinc-500">Q.</span>
        {quiz.question}
      </h1>

      <div className="rounded-xl bg-zinc-50 px-4 py-5 md:px-6 md:py-6">
        <p className="mx-auto max-w-3xl text-base leading-7 md:text-lg md:leading-8">
          {descriptionLines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < descriptionLines.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>

      <div className="mt-5 flex w-full justify-center md:mt-6">
        <QuizAnswerField
          optionText={quiz.optionText}
          quizType={quiz.quizType}
          disabled={isAnswerLocked}
          selectedAnswer={selectedAnswer}
          shortAnswer={shortAnswer}
          onSelectAnswer={onSelectAnswer}
          onShortAnswerChange={onShortAnswerChange}
        />
      </div>
    </>
  );
}
