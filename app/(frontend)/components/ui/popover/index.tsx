"use client";

import {
  ButtonHTMLAttributes,
  createContext,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
  Ref,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";

type PopoverContextValue = {
  contentId: string;
  open: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  setOpen: (open: boolean) => void;
};

type PopoverProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  ref?: Ref<HTMLDivElement>;
};

type PopoverTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>;
};

type PopoverContentProps = HTMLAttributes<HTMLDivElement> & {
  forceMount?: boolean;
  ref?: Ref<HTMLDivElement>;
};

type PopoverComponent = typeof Popover & {
  Trigger: typeof PopoverTrigger;
  Content: typeof PopoverContent;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext(componentName: string) {
  const context = useContext(PopoverContext);

  if (!context) {
    throw new Error(`${componentName} must be used within Popover.`);
  }

  return context;
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

function Popover({
  children,
  className = "",
  open,
  defaultOpen = false,
  onOpenChange,
  ref,
  ...props
}: PopoverProps) {
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  const setOpen = useCallback((nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);

  useEffect(() => {
    if (!currentOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [currentOpen, setOpen]);

  return (
    <PopoverContext.Provider
      value={{
        contentId,
        open: currentOpen,
        rootRef,
        setOpen,
      }}
    >
      <div
        ref={(node) => setRefs(node, [rootRef, ref])}
        className={twMerge("relative inline-block", className)}
        {...props}
      >
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

function PopoverTrigger({
  children,
  onClick,
  type = "button",
  ref,
  ...props
}: PopoverTriggerProps) {
  const { contentId, open, setOpen } = usePopoverContext("Popover.Trigger");

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (!event.defaultPrevented) {
      setOpen(!open);
    }
  };

  return (
    <button
      aria-controls={contentId}
      aria-expanded={open}
      aria-haspopup="dialog"
      data-state={open ? "open" : "closed"}
      ref={ref}
      type={type}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

function PopoverContent({
  children,
  className = "",
  forceMount = false,
  ref,
  ...props
}: PopoverContentProps) {
  const { contentId, open } = usePopoverContext("Popover.Content");

  if (!forceMount && !open) {
    return null;
  }

  return (
    <div
      aria-hidden={!open}
      data-state={open ? "open" : "closed"}
      id={contentId}
      ref={ref}
      role="dialog"
      className={twMerge(
        "absolute top-full left-0 z-10 mt-2 rounded-md border border-zinc-300 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
        !open ? "hidden" : undefined,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

Object.assign(Popover, {
  Trigger: PopoverTrigger,
  Content: PopoverContent,
});

export default Popover as PopoverComponent;
