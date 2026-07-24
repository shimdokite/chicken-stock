import { InputHTMLAttributes, ReactNode, Ref, useId } from "react";
import { IconSearch } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";

type InputVariant = "underline" | "pill" | "box";

type InputSize = "sm" | "md";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  variant?: InputVariant;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  errorMessage?: ReactNode;
  size?: InputSize;
  ref?: Ref<HTMLInputElement>;
};

const inputVariants: Record<InputVariant, string> = {
  underline:
    "rounded-none border-0 border-b border-(--cs-border-strong) bg-transparent px-0 shadow-none focus:border-(--cs-border-strong)",
  pill: "rounded-lg border border-(--cs-border-subtle) bg-(--cs-surface-base) px-2.5 shadow-none focus:border-(--cs-border-subtle)",
  box: "rounded-lg border border-(--cs-border-subtle) bg-(--cs-surface-raised) px-3 shadow-(--cs-shadow-sm) focus:border-(--cs-border-subtle)",
};

const sizeClassName: Record<InputSize, string> = {
  sm: "h-9 text-sm",
  md: "h-10 text-base",
};

export const SearchIcon = ({ className = "" }: { className?: string }) => (
  <IconSearch aria-hidden="true" className={className} size={18} stroke={2} />
);

export default function Input({
  className = "",
  inputClassName = "",
  variant = "box",
  size = "md",
  type = "text",
  leftAddon,
  rightAddon,
  errorMessage,
  ref,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  const errorId = useId();
  const canShowError = variant === "underline";
  const showErrorMessage = canShowError && Boolean(errorMessage);
  const describedBy = showErrorMessage
    ? [ariaDescribedBy, errorId].filter(Boolean).join(" ")
    : ariaDescribedBy;

  return (
    <span className={twMerge("relative inline-flex w-full", className)}>
      <span className="relative inline-flex w-full items-center">
        {leftAddon ? (
          <span className="pointer-events-none absolute left-1 text-zinc-400">
            {leftAddon}
          </span>
        ) : null}

        <input
          ref={ref}
          type={type}
          aria-describedby={describedBy}
          aria-invalid={showErrorMessage ? true : ariaInvalid}
          className={twMerge(
            "w-full min-w-0 text-(--cs-text-strong) transition outline-none placeholder:text-(--cs-text-muted) focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-(--cs-surface-base) disabled:text-(--cs-text-muted)",
            type === "number"
              ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              : undefined,
            inputVariants[variant],
            sizeClassName[size],
            leftAddon ? "pl-7" : undefined,
            rightAddon ? "pr-8" : undefined,
            inputClassName,
          )}
          {...props}
        />

        {rightAddon ? (
          <span className="pointer-events-none absolute right-2 text-base font-medium text-zinc-950">
            {rightAddon}
          </span>
        ) : null}
      </span>

      {showErrorMessage && (
        <span
          id={errorId}
          className="absolute top-full right-0 left-0 mt-1 text-center text-sm font-semibold text-red-500"
        >
          {errorMessage}
        </span>
      )}
    </span>
  );
}
