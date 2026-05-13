import { CSSProperties, InputHTMLAttributes, ReactNode, Ref } from "react";
import { IconSearch } from "@tabler/icons-react";

type InputVariant = "underline" | "pill" | "box";
type InputSize = "sm" | "md";
type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "width"
> & {
  variant?: InputVariant;
  inputSize?: InputSize;
  placeholder?: string;
  containerClassName?: string;
  focusable?: boolean;
  leftIcon?: ReactNode;
  rightAddon?: ReactNode;
  width?: CSSProperties["width"];
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
  <IconSearch
    aria-hidden="true"
    className={className}
    size={18}
    stroke={2}
  />
);

export default function Input({
  className = "",
  variant = "box",
  inputSize = "md",
  containerClassName = "w-full",
  focusable = true,
  type = "text",
  leftIcon,
  rightAddon,
  width,
  ref,
  style,
  ...props
}: InputProps) {
  const containerStyle = leftIcon || rightAddon ? { width } : undefined;
  const inputStyle =
    !leftIcon && !rightAddon && width ? { ...style, width } : style;

  return (
    <span
      className={["relative inline-flex items-center", containerClassName].join(
        " ",
      )}
      style={containerStyle}
    >
      {leftIcon ? (
        <span className="pointer-events-none absolute left-2 text-zinc-400">
          {leftIcon}
        </span>
      ) : null}

      <input
        ref={ref}
        type={type}
        style={inputStyle}
        className={[
          "w-full min-w-0 text-zinc-950 transition outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400",
          leftIcon ? "pl-8" : "",
          rightAddon ? "pr-8" : "",
          type === "number"
            ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            : "",
          variantClassName[variant].base,
          focusable ? variantClassName[variant].focus : "",
          sizeClassName[inputSize],
          className,
        ].join(" ")}
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
