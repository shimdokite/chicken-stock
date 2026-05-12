"use client";

import { CSSProperties, useId, useState } from "react";

type SegmentedSelectedStyle = "panel" | "inverted-panel" | "text";
type SegmentedOption = {
  label: string;
  value: string;
  disabled?: boolean;
  labelClassName?: string;
  labelWidth?: CSSProperties["width"];
  selectedTextColor?: string;
  selectedTextClassName?: string;
};
type SegmentedControlProps = {
  options: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  selectedStyle?: SegmentedSelectedStyle;
  onValueChange?: (value: string) => void;
  "aria-label": string;
  className?: string;
};

export default function SegmentedControl({
  options,
  value,
  defaultValue,
  selectedStyle = "panel",
  onValueChange,
  "aria-label": ariaLabel,
  className = "",
}: SegmentedControlProps) {
  const groupId = useId();

  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value,
  );

  const selectedValue = value ?? internalValue;

  const selectValue = (nextValue: string) => {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <div
      aria-label={ariaLabel}
      className={[
        "inline-flex h-8 items-center rounded-md p-0.5 text-sm font-semibold text-zinc-950",
        selectedStyle === "inverted-panel" ? "bg-white" : "bg-zinc-200",
        className,
      ].join(" ")}
      role="radiogroup"
    >
      {options.map((option) => {
        const selected = option.value === selectedValue;
        const id = `${groupId}-${option.value}`;
        const selectedClassName =
          selectedStyle === "panel"
            ? "bg-white text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
            : selectedStyle === "inverted-panel"
              ? "bg-zinc-200 text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
              : "text-white";
        const labelStyle: CSSProperties = {
          ...(option.labelWidth ? { width: option.labelWidth } : {}),
          ...(selected && option.selectedTextColor
            ? { color: option.selectedTextColor }
            : {}),
        };

        return (
          <label
            key={option.value}
            htmlFor={id}
            style={labelStyle}
            className={[
              "relative inline-flex h-7 min-w-12 cursor-pointer items-center justify-center rounded px-3 transition",
              selected
                ? selectedClassName
                : "text-zinc-500 hover:text-zinc-800",
              option.labelClassName,
              selected ? option.selectedTextClassName : "",
              option.disabled ? "cursor-not-allowed opacity-45" : "",
            ].join(" ")}
          >
            <input
              id={id}
              checked={selected}
              className="sr-only"
              disabled={option.disabled}
              name={groupId}
              onChange={() => selectValue(option.value)}
              type="radio"
              value={option.value}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
