"use client";

import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import {
  ButtonHTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  Ref,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};
export type SelectPlacement = "bottom" | "top";

type SelectProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "defaultValue" | "onChange" | "value"
> & {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  optionClassName?: string;
  placement?: SelectPlacement;
  onValueChange?: (value: string) => void;
  ref?: Ref<HTMLButtonElement>;
};

const contentPlacementClassName: Record<SelectPlacement, string> = {
  bottom: "top-full mt-2",
  top: "bottom-full mb-2",
};

function getBoundaryRect(element: HTMLElement) {
  let parent = element.parentElement;

  while (parent) {
    const { overflowX, overflowY } = window.getComputedStyle(parent);
    const hasOverflowBoundary = [overflowX, overflowY].some((overflow) =>
      ["auto", "scroll", "hidden", "clip"].includes(overflow),
    );

    if (hasOverflowBoundary) {
      return parent.getBoundingClientRect();
    }

    parent = parent.parentElement;
  }

  return {
    top: 0,
    bottom: window.innerHeight,
  };
}

function setRefs<T>(node: T, refs: Array<Ref<T> | undefined>) {
  refs.forEach((ref) => {
    if (!ref) {
      return;
    }

    if (typeof ref === "function") {
      ref(node);
      return;
    }

    ref.current = node;
  });
}

export default function Select({
  id,
  options,
  value,
  defaultValue = "",
  placeholder = "선택해 주세요",
  disabled = false,
  className = "",
  triggerClassName = "",
  contentClassName = "",
  optionClassName = "",
  placement = "bottom",
  onClick,
  onKeyDown,
  onValueChange,
  ref,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listboxId = `${triggerId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] =
    useState<SelectPlacement>(placement);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const currentOpen = open && !disabled;
  const selectedOption = options.find(
    (option) => option.value === currentValue,
  );
  const enabledOptions = useMemo(
    () => options.filter((option) => !option.disabled),
    [options],
  );
  const resolvePlacement = useCallback(() => {
    const trigger = triggerRef.current;
    const content = contentRef.current;

    if (!trigger || !content) {
      return placement;
    }

    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const contentHeight = content.offsetHeight;
    const boundaryRect = getBoundaryRect(trigger);
    const spaceBelow = boundaryRect.bottom - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - boundaryRect.top - gap;

    if (
      placement === "bottom" &&
      contentHeight > spaceBelow &&
      spaceAbove >= spaceBelow
    ) {
      return "top";
    }

    if (
      placement === "top" &&
      contentHeight > spaceAbove &&
      spaceBelow > spaceAbove
    ) {
      return "bottom";
    }

    return placement;
  }, [placement]);

  const updateValue = useCallback(
    (nextValue: string, shouldClose: boolean) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }

      onValueChange?.(nextValue);

      if (shouldClose) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [isControlled, onValueChange],
  );

  const selectValue = useCallback(
    (nextValue: string) => {
      updateValue(nextValue, true);
    },
    [updateValue],
  );

  const selectAdjacentValue = useCallback(
    (offset: number) => {
      if (enabledOptions.length === 0) {
        return;
      }

      const selectedIndex = enabledOptions.findIndex(
        (option) => option.value === currentValue,
      );
      const currentIndex = selectedIndex === -1 ? 0 : selectedIndex;
      const nextIndex =
        (currentIndex + offset + enabledOptions.length) % enabledOptions.length;

      updateValue(enabledOptions[nextIndex].value, false);
    },
    [currentValue, enabledOptions, updateValue],
  );

  const handleTriggerClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      setOpen((currentOpen) => !currentOpen);
    }
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      selectAdjacentValue(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      selectAdjacentValue(-1);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((currentOpen) => !currentOpen);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!currentOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
    };
  }, [currentOpen]);

  useLayoutEffect(() => {
    if (!currentOpen) {
      return;
    }

    const updateResolvedPlacement = () => {
      setResolvedPlacement(resolvePlacement());
    };

    updateResolvedPlacement();
    window.addEventListener("resize", updateResolvedPlacement);
    window.addEventListener("scroll", updateResolvedPlacement, true);

    return () => {
      window.removeEventListener("resize", updateResolvedPlacement);
      window.removeEventListener("scroll", updateResolvedPlacement, true);
    };
  }, [currentOpen, resolvePlacement]);

  return (
    <div ref={rootRef} className={twMerge("relative inline-block", className)}>
      <button
        id={triggerId}
        aria-controls={listboxId}
        aria-expanded={currentOpen}
        aria-haspopup="listbox"
        className={twMerge(
          "inline-flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg border border-(--cs-border-subtle) bg-(--cs-surface-raised) px-3 text-left text-base text-(--cs-text-strong) shadow-(--cs-shadow-sm) transition outline-none hover:border-(--cs-border-strong) focus-visible:border-(--cs-border-subtle) focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-(--cs-surface-base) disabled:text-(--cs-text-muted)",
          triggerClassName,
        )}
        data-state={currentOpen ? "open" : "closed"}
        disabled={disabled}
        ref={(node) => setRefs(node, [triggerRef, ref])}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        {...props}
      >
        <span
          className={twMerge(
            "min-w-0 truncate",
            selectedOption ? undefined : "text-(--cs-text-muted)",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <IconChevronDown
          aria-hidden="true"
          className={twMerge(
            "size-5 shrink-0 text-(--cs-text-muted) transition-transform",
            currentOpen ? "rotate-180" : undefined,
          )}
          stroke={2}
        />
      </button>

      {currentOpen ? (
        <div
          aria-labelledby={triggerId}
          className={twMerge(
            "absolute left-0 z-20 max-h-60 w-full overflow-auto rounded-xl border border-(--cs-border-subtle) bg-(--cs-surface-raised) py-1 shadow-(--cs-shadow-lg)",
            contentPlacementClassName[resolvedPlacement],
            contentClassName,
          )}
          id={listboxId}
          ref={contentRef}
          role="listbox"
        >
          {options.map((option) => {
            const selected = option.value === currentValue;

            return (
              <button
                aria-selected={selected}
                className={twMerge(
                  "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm text-(--cs-text-strong) transition hover:bg-(--cs-brand-50) disabled:cursor-not-allowed disabled:text-(--cs-text-muted)",
                  selected
                    ? "bg-(--cs-brand-100) font-semibold text-(--cs-brand-800)"
                    : undefined,
                  optionClassName,
                )}
                disabled={option.disabled}
                key={option.value}
                role="option"
                type="button"
                onClick={() => selectValue(option.value)}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {selected ? (
                  <IconCheck
                    aria-hidden="true"
                    className="size-4 shrink-0 text-(--cs-brand-700)"
                    stroke={2}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
