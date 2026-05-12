import { InputHTMLAttributes, ReactNode, Ref } from "react";

type InputVariant = "underline" | "pill" | "box";
type InputSize = "sm" | "md";
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  variant?: InputVariant;
  inputSize?: InputSize;
  placeholder?: string;
  containerClassName?: string;
  focusable?: boolean;
  leftIcon?: ReactNode;
  rightAddon?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

const variantClassName: Record<InputVariant, { base: string; focus: string }> =
  {
    underline: {
      base: "rounded-none border-0 border-b border-zinc-500 bg-transparent px-0 shadow-none",
      focus: "focus:border-zinc-950 focus:ring-0",
    },
    pill: {
      base: "rounded-md border border-zinc-200 bg-white px-2.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]",
      focus: "focus:border-sky-300 focus:ring-2 focus:ring-sky-100",
    },
    box: {
      base: "rounded-md border border-zinc-200 bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
      focus: "focus:border-sky-300 focus:ring-2 focus:ring-sky-100",
    },
  };

const sizeClassName: Record<InputSize, string> = {
  sm: "h-7 text-sm",
  md: "h-10 text-base",
};

export const SearchIcon = ({ className = "" }: { className?: string }) => (
  // TODO: 추후 tabler 라이브러리로 변경 예정
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height="18"
    viewBox="0 0 24 24"
    width="18"
  >
    <path
      d="m20 20-4.4-4.4m2.4-5.1a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

export default function Input({
  className = "",
  variant = "box",
  inputSize = "md",
  containerClassName = "w-full",
  focusable = true,
  leftIcon,
  rightAddon,
  ref,
  type = "text",
  ...props
}: InputProps) {
  const input = (
    <input
      ref={ref}
      type={type}
      className={[
        "w-full min-w-0 text-zinc-950 transition outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400",
        leftIcon ? "pl-8" : "",
        rightAddon ? "pr-8" : "",
        variantClassName[variant].base,
        focusable ? variantClassName[variant].focus : "",
        sizeClassName[inputSize],
        className,
      ].join(" ")}
      {...props}
    />
  );

  if (!leftIcon && !rightAddon) {
    return input;
  }

  return (
    <span
      className={["relative inline-flex items-center", containerClassName].join(
        " ",
      )}
    >
      {leftIcon ? (
        <span className="pointer-events-none absolute left-2 text-zinc-400">
          {leftIcon}
        </span>
      ) : null}

      {input}

      {rightAddon ? (
        <span className="pointer-events-none absolute right-0 text-base font-medium text-zinc-950">
          {rightAddon}
        </span>
      ) : null}
    </span>
  );
}
