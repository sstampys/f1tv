import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type TransitionEvent as ReactTransitionEvent,
} from "react";
import { createPortal } from "react-dom";
import { menuGeometry } from "@/lib/menu-geometry";
import { PAGE_EXIT_EVENT } from "@/lib/reveal";

export type DropdownOption = {
  value: string;
  label: string;
  /** Optional right-aligned text (the stream language code). */
  meta?: string;
  disabled?: boolean;
};

type DropdownProps = {
  value: string;
  options: readonly DropdownOption[];
  onChange: (value: string) => void;
  /** Accessible name for the control; the current value is appended to it. */
  ariaLabel: string;
  /** Which edge of the trigger the panel follows. */
  align?: "start" | "end";
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Only one menu may be open at a time. */
let activeMenuClose: (() => void) | null = null;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function tokenMs(name: string) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return 0;
  const value = parseFloat(raw);
  return raw.endsWith("ms") ? value : value * 1000;
}

/**
 * The site's only dropdown: a plain text trigger (link states, no fill, no
 * icon) and a fixed-position listbox built from the measured nav-pill surface,
 * the measured field radius and the site's text/spacing/reveal tokens.
 */
export function Dropdown({
  value,
  options,
  onChange,
  ariaLabel,
  align = "end",
}: DropdownProps) {
  const reactId = useId();
  const triggerId = `${reactId}-trigger`;
  const panelId = `${reactId}-panel`;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [frozen, setFrozen] = useState<readonly DropdownOption[]>(options);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const openRef = useRef(false);
  const mountedRef = useRef(false);
  const visibleRef = useRef(false);
  const activeRef = useRef(0);
  const safetyRef = useRef<number | undefined>(undefined);
  const typeaheadRef = useRef("");
  const selfRef = useRef<() => void>(() => {});
  const chooseRef = useRef<(option: DropdownOption) => void>(() => {});

  const current = options.find((option) => option.value === value);
  const currentLabel = current?.label ?? value;
  const shown = mounted ? frozen : options;

  openRef.current = open;
  mountedRef.current = mounted;
  activeRef.current = activeIndex;

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const root = getComputedStyle(document.documentElement);
    const gutter = parseFloat(root.getPropertyValue("--gutter")) || 0;
    const offset = parseFloat(root.getPropertyValue("--menu-offset")) || 0;
    const container =
      trigger.closest(".page-container") ?? trigger.parentElement ?? document.body;
    const t = trigger.getBoundingClientRect();
    const c = container.getBoundingClientRect();

    // Read the natural size once, before writing the final geometry.
    panel.style.width = "max-content";
    panel.style.maxHeight = "none";

    const geo = menuGeometry({
      trigger: {
        top: t.top,
        left: t.left,
        right: t.right,
        bottom: t.bottom,
        width: t.width,
        height: t.height,
      },
      container: {
        top: c.top,
        left: c.left,
        right: c.right,
        bottom: c.bottom,
        width: c.width,
        height: c.height,
      },
      naturalWidth: panel.offsetWidth,
      naturalHeight: panel.offsetHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      gutter,
      offset,
      align,
    });

    panel.style.width = `${geo.width}px`;
    panel.style.left = `${geo.left}px`;
    panel.style.top = `${geo.top}px`;
    panel.style.maxHeight = `${geo.maxHeight}px`;
  }, [align]);

  const closeMenu = useCallback((immediate: boolean, refocus: boolean) => {
    if (!mountedRef.current) return;
    openRef.current = false;
    setOpen(false);
    setEntered(false);
    if (activeMenuClose === selfRef.current) activeMenuClose = null;
    if (refocus) triggerRef.current?.focus({ preventScroll: true });

    if (immediate || reducedMotion() || !visibleRef.current) {
      window.clearTimeout(safetyRef.current);
      visibleRef.current = false;
      setMounted(false);
      return;
    }

    const panel = panelRef.current;
    if (panel) panel.style.willChange = "opacity, transform";
    window.clearTimeout(safetyRef.current);
    safetyRef.current = window.setTimeout(() => {
      if (!openRef.current) {
        visibleRef.current = false;
        setMounted(false);
      }
    }, tokenMs("--menu-duration") * 1.5);
  }, []);

  const closeImmediate = useCallback(() => {
    if (activeMenuClose === selfRef.current) activeMenuClose = null;
    closeMenu(true, false);
  }, [closeMenu]);
  selfRef.current = closeImmediate;

  const openMenu = useCallback(() => {
    if (openRef.current) return;
    activeMenuClose?.();

    const selected = options.findIndex((option) => option.value === value);
    const next =
      selected >= 0 ? selected : options.findIndex((option) => !option.disabled);
    const safe = next >= 0 ? next : 0;

    setFrozen(options);
    setActiveIndex(safe);
    activeRef.current = safe;
    setEntered(false);
    setMounted(true);
    setOpen(true);
    openRef.current = true;
    mountedRef.current = true;
    typeaheadRef.current = "";
    activeMenuClose = selfRef.current;
  }, [options, value]);

  const choose = useCallback(
    (option: DropdownOption) => {
      if (option.disabled) return;
      if (option.value !== value) onChange(option.value);
      closeMenu(false, true);
    },
    [closeMenu, onChange, value],
  );
  chooseRef.current = choose;

  // Position and focus before the first paint; one read pass, one write pass.
  useIsomorphicLayoutEffect(() => {
    if (!open || !mounted) return;
    position();
    const panel = panelRef.current;
    const option = optionRefs.current[activeRef.current];
    if (!panel || !option) return;
    panel.scrollTop = Math.max(
      0,
      option.offsetTop - (panel.clientHeight - option.offsetHeight) / 2,
    );
    option.focus({ preventScroll: true });
  }, [open, mounted, position]);

  // Start the transition after the invisible first frame, so it always runs.
  useEffect(() => {
    if (!open || !mounted) return;
    const panel = panelRef.current;
    if (reducedMotion()) {
      visibleRef.current = true;
      setEntered(true);
      return;
    }
    if (panel) panel.style.willChange = "opacity, transform";
    const id = window.requestAnimationFrame(() => {
      visibleRef.current = true;
      setEntered(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, mounted]);

  // Outside press closes.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu(false, false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, closeMenu]);

  // Page scroll closes, resize repositions, page exit closes instantly.
  useEffect(() => {
    if (!mounted) return;
    const onScroll = () => {
      if (openRef.current) closeMenu(true, false);
    };
    const onResize = () => {
      if (openRef.current) position();
    };
    const onExit = () => closeImmediate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener(PAGE_EXIT_EVENT, onExit);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener(PAGE_EXIT_EVENT, onExit);
    };
  }, [mounted, closeMenu, closeImmediate, position]);

  useEffect(
    () => () => {
      window.clearTimeout(safetyRef.current);
      if (activeMenuClose === selfRef.current) activeMenuClose = null;
    },
    [],
  );

  const moveTo = (index: number) => {
    const panel = panelRef.current;
    const option = optionRefs.current[index];
    if (!panel || !option) return;
    setActiveIndex(index);
    activeRef.current = index;
    option.focus({ preventScroll: true });
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < panel.scrollTop) panel.scrollTop = top;
    else if (bottom > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = bottom - panel.clientHeight;
    }
  };

  const step = (from: number, direction: 1 | -1) => {
    for (let i = from + direction; i >= 0 && i < shown.length; i += direction) {
      if (!shown[i].disabled) return i;
    }
    return from;
  };

  const firstEnabled = () =>
    Math.max(0, shown.findIndex((option) => !option.disabled));

  const lastEnabled = () => {
    for (let i = shown.length - 1; i >= 0; i -= 1) {
      if (!shown[i].disabled) return i;
    }
    return 0;
  };

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const key = event.key;

    if (key === "ArrowDown") {
      event.preventDefault();
      moveTo(step(activeRef.current, 1));
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      moveTo(step(activeRef.current, -1));
      return;
    }
    if (key === "Home") {
      event.preventDefault();
      moveTo(firstEnabled());
      return;
    }
    if (key === "End") {
      event.preventDefault();
      moveTo(lastEnabled());
      return;
    }
    if (key === "PageDown" || key === "PageUp") {
      event.preventDefault();
      const panel = panelRef.current;
      const row = optionRefs.current[0]?.offsetHeight ?? 0;
      const page = Math.max(1, Math.floor((panel?.clientHeight ?? 0) / (row || 1)));
      const target =
        key === "PageDown"
          ? Math.min(shown.length - 1, activeRef.current + page)
          : Math.max(0, activeRef.current - page);
      moveTo(shown[target]?.disabled ? step(target, key === "PageDown" ? 1 : -1) : target);
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      const option = shown[activeRef.current];
      if (option) chooseRef.current(option);
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      closeMenu(false, true);
      return;
    }
    if (key === "Tab") {
      // Let the browser continue from the trigger; the panel leaves the tab
      // order immediately.
      closeMenu(true, true);
      return;
    }

    if (
      key.length === 1 &&
      key !== " " &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      const buffer = `${typeaheadRef.current}${key}`.toLowerCase();
      let index = shown.findIndex(
        (option) =>
          !option.disabled && option.label.toLowerCase().startsWith(buffer),
      );
      if (index < 0 && buffer.length > 1) {
        typeaheadRef.current = key.toLowerCase();
        index = shown.findIndex(
          (option) =>
            !option.disabled &&
            option.label.toLowerCase().startsWith(typeaheadRef.current),
        );
      } else {
        typeaheadRef.current = buffer;
      }
      if (index >= 0) {
        event.preventDefault();
        moveTo(index);
      }
    }
  };

  const onTriggerClick = () => {
    if (openRef.current) closeMenu(false, false);
    else openMenu();
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
    }
  };

  const onTransitionEnd = (event: ReactTransitionEvent<HTMLDivElement>) => {
    if (event.target !== panelRef.current || event.propertyName !== "opacity") {
      return;
    }
    if (!openRef.current) {
      visibleRef.current = false;
      setMounted(false);
      return;
    }
    panelRef.current.style.willChange = "";
  };

  const rows = useMemo(
    () =>
      shown.map((option, index) => (
        <div
          key={option.value}
          ref={(element) => {
            optionRefs.current[index] = element;
          }}
          id={`${panelId}-option-${index}`}
          role="option"
          aria-selected={option.value === value}
          aria-disabled={option.disabled || undefined}
          tabIndex={index === activeIndex ? 0 : -1}
          className="menu__option"
          onClick={() => chooseRef.current(option)}
        >
          <span className="menu__label">{option.label}</span>
          {option.meta ? <span className="menu__meta">{option.meta}</span> : null}
        </div>
      )),
    [shown, value, activeIndex, panelId],
  );

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="control menu__trigger"
        data-reveal
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={mounted ? panelId : undefined}
        aria-label={`${ariaLabel}: ${currentLabel}`}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
      >
        {currentLabel}
      </button>

      {mounted
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="listbox"
              aria-labelledby={triggerId}
              tabIndex={-1}
              className="menu"
              data-state={entered ? "open" : "closed"}
              aria-hidden={!open}
              inert={!open}
              onKeyDown={onPanelKeyDown}
              onTransitionEnd={onTransitionEnd}
            >
              {rows}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
