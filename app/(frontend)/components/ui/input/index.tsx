import { InputHTMLAttributes, ReactNode, Ref } from "react";
import { IconSearch } from "@tabler/icons-react";
import { twMerge } from "tailwind-merge";

type InputVariant = "underline" | "pill" | "box";
type InputSize = "sm" | "md";
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  variant?: InputVariant;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  focusable?: boolean;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  size?: InputSize;
  ref?: Ref<HTMLInputElement>;
};

const inputVariants: Record<InputVariant, { base: string; focus: string }> = {
  underline: {
    base: "rounded-none border-0 border-b border-zinc-500 bg-transparent px-0 shadow-none",
    focus: "focus:border-zinc-950 focus:ring-0",
  },
  pill: {
    base: "rounded-md border-0 bg-white px-2.5 shadow-none",
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
  <IconSearch aria-hidden="true" className={className} size={18} stroke={2} />
);

export default function Input({
  className = "",
  inputClassName = "",
  variant = "box",
  size = "md",
  focusable = true,
  type = "text",
  leftAddon,
  rightAddon,
  ref,
  ...props
}: InputProps) {
  return (
    <span
      className={twMerge("relative inline-flex w-full items-center", className)}
    >
      {leftAddon ? (
        <span className="pointer-events-none absolute left-1 text-zinc-400">
          {leftAddon}
        </span>
      ) : null}

      <input
        ref={ref}
        type={type}
        className={twMerge(
          "w-full min-w-0 text-zinc-950 transition outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400",
          type === "number"
            ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            : undefined,
          inputVariants[variant].base,
          focusable ? inputVariants[variant].focus : undefined,
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
  );
}
