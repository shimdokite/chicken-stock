"use client";

import {
  createContext,
  useContext,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { twMerge } from "tailwind-merge";

type TabDirection = "row" | "col";
type TabType = "fill" | "underline";
type TabValue = string;

interface TabContextValue {
  value: TabValue;
  direction: TabDirection;
  type: TabType;
  onValueChange: (value: TabValue) => void;
}

interface TabRootProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> {
  children: ReactNode;
  defaultValue?: TabValue;
  value?: TabValue;
  onValueChange?: (value: TabValue) => void;
  direction?: TabDirection;
  type?: TabType;
}

interface TabItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "value"
> {
  children: ReactNode;
  value: TabValue;
  activeClassName?: string;
  inactiveClassName?: string;
}

const TabContext = createContext<TabContextValue | null>(null);

const rootDirectionClassName: Record<TabDirection, string> = {
  row: "flex-row",
  col: "flex-col items-end",
};

const rootTypeClassName: Record<TabType, string> = {
  fill: "rounded-lg bg-(--cs-surface-raised) p-1",
  underline: "",
};

const itemUnderLineDirectionClassName: Record<TabDirection, string> = {
  row: "border-b-1",
  col: "justify-end border-b-1 w-fit",
};

const itemTypeClassName: Record<TabType, string> = {
  fill: "w-fit",
  underline: "",
};

const itemActiveClassName: Record<TabType, string> = {
  fill: "bg-(--cs-color-gray-200)",
  underline: "border-black",
};

const itemInactiveClassName: Record<TabType, string> = {
  fill: "",
  underline: "border-transparent",
};

const useTabContext = () => {
  const context = useContext(TabContext);

  if (!context) {
    throw new Error("Tab.Item must be used within Tab.Root.");
  }

  return context;
};

export function Root({
  children,
  className = "",
  defaultValue = "",
  value,
  onValueChange,
  direction = "row",
  type = "fill",
  ...props
}: TabRootProps) {
  const [innerValue, setInnerValue] = useState(defaultValue);
  const currentValue = value ?? innerValue;

  const handleValueChange = (nextValue: TabValue) => {
    if (value === undefined) {
      setInnerValue(nextValue);
    }

    onValueChange?.(nextValue);
  };

  const rootClassName = twMerge(
    "inline-flex gap-5",
    rootDirectionClassName[direction],
    rootTypeClassName[type],
    className,
  );

  return (
    <TabContext.Provider
      value={{
        value: currentValue,
        direction,
        type,
        onValueChange: handleValueChange,
      }}
    >
      <div
        className={rootClassName}
        role="tablist"
        aria-orientation={direction === "col" ? "vertical" : "horizontal"}
        {...props}
      >
        {children}
      </div>
    </TabContext.Provider>
  );
}

export function Item({
  children,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
  value,
  onClick,
  ...props
}: TabItemProps) {
  const context = useTabContext();
  const isActive = context.value === value;

  const handleClick: TabItemProps["onClick"] = (event) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      context.onValueChange(value);
    }
  };

  const itemClassName = twMerge(
    "inline-flex items-center justify-center whitespace-nowrap cursor-pointer font-medium text-black transition-colors disabled:pointer-events-none disabled:opacity-50",
    itemTypeClassName[context.type],
    context.type === "underline"
      ? itemUnderLineDirectionClassName[context.direction]
      : "",
    isActive
      ? `${itemActiveClassName[context.type]} ${activeClassName}`
      : `${itemInactiveClassName[context.type]} ${inactiveClassName}`,
    className,
  );

  return (
    <button
      className={itemClassName}
      type="button"
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      data-state={isActive ? "active" : "inactive"}
      data-value={value}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

const Tab = {
  Root,
  Item,
} as const;

export default Tab;
