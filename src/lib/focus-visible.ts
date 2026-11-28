import { useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Whether the last thing the visitor did was a key press.
 *
 * The browser's own :focus-visible cannot be trusted on its own: Chrome
 * treats a select that was opened with the pointer as focus-visible, and
 * Safari blurs a control while its popup is open and gives the focus back
 * when it closes. So the last input type is tracked here, and a control
 * marks itself only while the focus that landed on it came from the keyboard.
 */
let keyboard = false;

if (typeof window !== "undefined") {
  window.addEventListener(
    "keydown",
    () => {
      keyboard = true;
    },
    true,
  );
  window.addEventListener(
    "pointerdown",
    () => {
      keyboard = false;
    },
    true,
  );
  // A mouse press that is not a pointer event still counts as a pointer.
  window.addEventListener(
    "mousedown",
    () => {
      keyboard = false;
    },
    true,
  );
}

/** True when the last interaction was a key press. */
export const isKeyboardInteraction = () => keyboard;

type FocusRingHandlers = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
};

/**
 * The props a control needs to show its focus indicator for keyboard users
 * only. Spread them on the element: the indicator is drawn while
 * `data-focus-visible` is set, which happens only when the focus came from
 * the keyboard — never after a click.
 *
 * Handlers the control needs itself are passed in and run after the ring has
 * been updated.
 */
export function useFocusRing(extra?: Partial<FocusRingHandlers>) {
  const [visible, setVisible] = useState(false);

  return {
    "data-focus-visible": visible ? ("true" as const) : undefined,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      setVisible(false);
      extra?.onPointerDown?.(event);
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      setVisible(true);
      extra?.onKeyDown?.(event);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      setVisible(isKeyboardInteraction());
      extra?.onFocus?.(event);
    },
  };
}
