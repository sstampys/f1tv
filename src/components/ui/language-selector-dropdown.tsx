import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { DropdownOption } from "@/components/Dropdown";

/**
 * The site's dropdown, implemented by this component.
 *
 * Keeps the plain-text look: the trigger is the measured link style (no fill,
 * no border, no icon), and the panel reuses the measured menu tokens. Defaults
 * to language short codes (EN/ES/DE/IT/SV/NL); accepts any options for seasons,
 * stream sources, etc.
 */
export const LANGUAGE_OPTIONS: readonly DropdownOption[] = [
  { value: "EN", label: "English", meta: "EN" },
  { value: "ES", label: "Español", meta: "ES" },
  { value: "DE", label: "Deutsch", meta: "DE" },
  { value: "IT", label: "Italiano", meta: "IT" },
  { value: "SV", label: "Svenska", meta: "SV" },
  { value: "NL", label: "Nederlands", meta: "NL" },
];

type LanguageSelectorDropdownProps = {
  value: string;
  options?: readonly DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  align?: "start" | "end";
};

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function LanguageSelectorDropdown({
  value,
  options = LANGUAGE_OPTIONS,
  onChange,
  ariaLabel = "Select language",
  align = "start",
}: LanguageSelectorDropdownProps) {
  const reactId = useId();
  const panelId = `${reactId}-panel`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const current = options.find((option) => option.value === value);
  const currentLabel = current?.label ?? value;
  const selectedIndex = options.findIndex((option) => option.value === value);

  const closeMenu = (refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const openMenu = () => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const choose = (option: DropdownOption) => {
    if (option.disabled) return;
    if (option.value !== value) onChange(option.value);
    closeMenu(true);
  };

  // Fit the panel to the space beside the trigger, flipping when below is tight.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;

    const measure = () => {
      const rect = trigger.getBoundingClientRect();
      const root = getComputedStyle(document.documentElement);
      const offset = parseFloat(root.getPropertyValue("--menu-offset")) || 8;
      const token = parseFloat(root.getPropertyValue("--menu-max-height")) || 480;
      const gutter = 16;

      const below = window.innerHeight - rect.bottom - offset - gutter;
      const above = rect.top - offset - gutter;
      const next = below < 240 && above > below ? "top" : "bottom";

      setPlacement(next);
      setMaxHeight(Math.max(160, Math.min(next === "bottom" ? below : above, token)));
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  // Focus and scroll the active row into view before paint.
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const option = optionRefs.current[activeIndex];
    if (!panel || !option) return;
    panel.scrollTop = Math.max(
      0,
      option.offsetTop - (panel.clientHeight - option.offsetHeight) / 2,
    );
    option.focus({ preventScroll: true });
  }, [open, activeIndex]);

  // Outside press closes.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  // Page scroll closes, like the rest of the site's overlays.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  const moveTo = (index: number) => {
    setActiveIndex(Math.min(options.length - 1, Math.max(0, index)));
  };

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const key = event.key;

    if (key === "ArrowDown") {
      event.preventDefault();
      moveTo(activeIndex + 1);
      return;
    }
    if (key === "ArrowUp") {
      event.preventDefault();
      moveTo(activeIndex - 1);
      return;
    }
    if (key === "Home") {
      event.preventDefault();
      moveTo(0);
      return;
    }
    if (key === "End") {
      event.preventDefault();
      moveTo(options.length - 1);
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (key === "Tab") {
      closeMenu(false);
    }
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openMenu();
    }
  };

  return (
    <div className="dropdown-plain-root" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="control menu__trigger"
        data-reveal
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${ariaLabel}: ${currentLabel}`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
      >
        {currentLabel}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          className="dropdown-plain"
          data-align={align}
          data-placement={placement}
          style={maxHeight ? { maxHeight } : undefined}
          onKeyDown={onPanelKeyDown}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              tabIndex={index === activeIndex ? 0 : -1}
              className="menu__option"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span className="menu__label">{option.label}</span>
              {option.meta ? <span className="menu__meta">{option.meta}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
