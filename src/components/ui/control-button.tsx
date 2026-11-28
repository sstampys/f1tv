import type { ReactNode } from "react";
import { useFocusRing } from "@/lib/focus-visible";

/**
 * A plain text button.
 *
 * The focus indicator is for keyboard users only: a click never leaves one
 * behind (see lib/focus-visible.ts).
 */
export function ControlButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  const focusRing = useFocusRing();
  return (
    <button type="button" className="control" onClick={onClick} {...focusRing}>
      {children}
    </button>
  );
}
