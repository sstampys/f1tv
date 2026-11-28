/**
 * Native system dropdown.
 *
 * A plain `<select>`: the browser (and the operating system on mobile) owns the
 * popup list, so it behaves like every other control on the user's device —
 * wheel picker on iOS, native list on desktop, system keyboard navigation.
 * Styling is limited to the site's plain text control (no fill, border, radius
 * or custom arrow), so it matches the rest of the page.
 *
 * The control never keeps a focus indicator after a choice: picking a season
 * with the pointer leaves no outline behind. Keyboard users keep the focus
 * indicator (see `.control[data-focus-visible]` in styles.css), so the control
 * is only blurred when the pointer did the choosing.
 */
import { useRef } from "react";
import { isKeyboardInteraction, useFocusRing } from "@/lib/focus-visible";

export type SystemSelectOption = { value: string; label: string };

type SystemSelectProps = {
  value: string;
  options: readonly SystemSelectOption[];
  onChange: (value: string) => void;
  /** Accessible name; the native control has no visible label of its own. */
  ariaLabel: string;
};

export function SystemSelect({ value, options, onChange, ariaLabel }: SystemSelectProps) {
  // True while the popup was opened with the pointer; a keyboard choice keeps
  // the focus (and its focus indicator) on the control.
  const pointerChoice = useRef(false);

  // The focus indicator follows the keyboard, never the pointer.
  const focusRing = useFocusRing({
    onPointerDown: () => {
      pointerChoice.current = true;
    },
    onKeyDown: (event) => {
      pointerChoice.current = false;
      // Escape closes the popup again: release the focus, so no indicator is
      // left behind on the control.
      if (event.key === "Escape") event.currentTarget.blur();
    },
  });

  return (
    <select
      className="control"
      value={value}
      aria-label={ariaLabel}
      data-reveal
      {...focusRing}
      onChange={(event) => {
        const next = event.target.value;
        // A choice made with the keyboard keeps the focus on the control; one
        // made with the pointer gives it back to the page.
        const chosenWithKeyboard = isKeyboardInteraction();
        pointerChoice.current = false;
        onChange(next);
        if (!chosenWithKeyboard) event.currentTarget.blur();
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
