import type { ReactNode } from "react";
import Image from "next/image";
import { twMerge } from "tailwind-merge";

type AnswerButtonVariant = "default" | "true" | "false";

type AnswerButtonProps = {
  children: ReactNode;
  disabled?: boolean;
  isSelected: boolean;
  variant?: AnswerButtonVariant;
  onClick: () => void;
};

const answerButtonVariants: Record<AnswerButtonVariant, string> = {
  default:
    "w-full justify-start rounded-lg border border-transparent bg-zinc-50 px-4 py-3 text-left text-base leading-6 font-medium break-words hover:bg-zinc-100 md:px-5 md:text-lg md:leading-7",
  true: "h-24 w-full justify-center rounded-xl border-2 border-(--cs-color-blue-800) bg-white px-4 text-(--cs-color-blue-800) hover:bg-blue-50 md:h-28 md:px-6",
  false:
    "h-24 w-full justify-center rounded-xl border-2 border-[#FF5A60] bg-white px-4 text-[#FF5A60] hover:bg-red-50 md:h-28 md:px-6",
};

const selectedAnswerButtonVariants: Record<AnswerButtonVariant, string> = {
  default: "border-[#2563EB] bg-[#2563EB]/10",
  true: "bg-[#4d61f529]",
  false: "bg-red-50",
};

const trueFalseIconConfig = {
  true: {
    height: 91,
    src: "/icon/quizzes/o.svg",
    width: 91,
  },
  false: {
    height: 78,
    src: "/icon/quizzes/x.svg",
    width: 81,
  },
} satisfies Record<
  Exclude<AnswerButtonVariant, "default">,
  {
    height: number;
    src: string;
    width: number;
  }
>;

function getTrueFalseIcon(variant: AnswerButtonVariant) {
  if (variant === "true" || variant === "false") {
    return trueFalseIconConfig[variant];
  }

  return null;
}

export default function AnswerButton({
  children,
  disabled = false,
  isSelected,
  variant = "default",
  onClick,
}: AnswerButtonProps) {
  const trueFalseIcon = getTrueFalseIcon(variant);

  return (
    <button
      type="button"
      className={twMerge(
        "flex items-center transition",
        answerButtonVariants[variant],
        isSelected && selectedAnswerButtonVariants[variant],
        disabled && "cursor-not-allowed opacity-70",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {trueFalseIcon && (
        <>
          <span className="sr-only">{children}</span>
          <Image
            alt=""
            aria-hidden="true"
            className="h-12 w-auto md:h-16"
            height={trueFalseIcon.height}
            src={trueFalseIcon.src}
            width={trueFalseIcon.width}
          />
        </>
      )}

      {!trueFalseIcon && children}
    </button>
  );
}
