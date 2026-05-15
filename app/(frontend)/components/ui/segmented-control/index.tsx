"use client";

import {
  Children,
  createContext,
  isValidElement,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

type SegmentedStyle = "panel" | "invertedPanel" | "text";
type SegmentedOption = {
  label: string;
  value: string;
  disabled?: boolean;
  className?: string;
  selected?: string;
};

type SegmentedControlProps = {
  "aria-label": string;
  options?: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  style?: SegmentedStyle;
  className?: string;
  children?: ReactNode;
  onValueChange?: (value: string) => void;
};

type SegmentedControlItemProps = Omit<SegmentedOption, "label"> & {
  label?: string;
  children?: ReactNode;
};

type SegmentedControlContextValue = {
  groupId: string;
  selectedValue?: string;
  style: SegmentedStyle;
  selectValue: (value: string) => void;
};

type SegmentedControlComponent = ((
  props: SegmentedControlProps,
) => ReactNode) & {
  Item: typeof SegmentedControlItem;
};

const selectedVariants: Record<SegmentedStyle, string> = {
  panel: "bg-white text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
  invertedPanel:
    "bg-zinc-200 text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
  text: "text-white",
};

const SegmentedControlContext =
  createContext<SegmentedControlContextValue | null>(null);

function useSegmentedControlContext() {
  const context = useContext(SegmentedControlContext);

  if (!context) {
    throw new Error(
      "SegmentedControl.Item must be used within SegmentedControl.",
    );
  }

  return context;
}

function getFirstEnabledChildValue(children?: ReactNode) {
  const childArray = Children.toArray(children);
  const firstEnabledChild = childArray.find(
    (child) =>
      isValidElement<SegmentedControlItemProps>(child) &&
      child.type === SegmentedControlItem &&
      !child.props.disabled,
  );

  return isValidElement<SegmentedControlItemProps>(firstEnabledChild)
    ? firstEnabledChild.props.value
    : undefined;
}

function getInitialValue(
  options?: SegmentedOption[],
  defaultValue?: string,
  children?: ReactNode,
) {
  return (
    defaultValue ??
    options?.find((option) => !option.disabled)?.value ??
    getFirstEnabledChildValue(children)
  );
}

function SegmentedControlRoot({
  "aria-label": ariaLabel,
  style = "panel",
  className = "",
  options = [],
  value,
  defaultValue,
  children,
  onValueChange,
}: SegmentedControlProps) {
  const groupId = useId();
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    getInitialValue(options, defaultValue, children),
  );
  const selectedValue = isControlled ? value : internalValue;
  const selectValue = useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }

      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );
  const contextValue = useMemo(
    () => ({
      groupId,
      selectedValue,
      style,
      selectValue,
    }),
    [groupId, selectedValue, selectValue, style],
  );

  return (
    <div
      aria-label={ariaLabel}
      className={twMerge(
        "inline-flex h-8 items-center rounded-md p-0.5 text-sm font-semibold text-zinc-950",
        style === "invertedPanel" ? "bg-white" : "bg-zinc-200",
        className,
      )}
      role="radiogroup"
    >
      <SegmentedControlContext.Provider value={contextValue}>
        {children ??
          options.map((option) => (
            <SegmentedControlItem key={option.value} {...option} />
          ))}
      </SegmentedControlContext.Provider>
    </div>
  );
}

function SegmentedControlItem({
  label,
  value,
  disabled,
  className,
  selected: selectedClassName,
  children,
}: SegmentedControlItemProps) {
  const { groupId, selectedValue, style, selectValue } =
    useSegmentedControlContext();
  const selected = value === selectedValue;
  const id = `${groupId}-${value}`;

  return (
    <label
      htmlFor={id}
      className={twMerge(
        "relative inline-flex h-7 min-w-12 cursor-pointer items-center justify-center rounded px-3 transition",
        selected
          ? selectedVariants[style]
          : "text-zinc-500 hover:text-zinc-800",
        disabled ? "cursor-not-allowed opacity-45" : undefined,
        className,
        selected ? selectedClassName : undefined,
      )}
    >
      <input
        id={id}
        checked={selected}
        className="sr-only"
        disabled={disabled}
        name={groupId}
        onChange={() => selectValue(value)}
        type="radio"
        value={value}
      />
      {children ?? label}
    </label>
  );
}

const SegmentedControl = Object.assign(SegmentedControlRoot, {
  Item: SegmentedControlItem,
}) satisfies SegmentedControlComponent;

export default SegmentedControl;
