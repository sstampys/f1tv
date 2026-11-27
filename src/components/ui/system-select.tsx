/**
 * Native system dropdown.
 *
 * A plain `<select>`: the browser (and the operating system on mobile) owns the
 * popup list, so it behaves like every other control on the user's device —
 * wheel picker on iOS, native list on desktop, system keyboard navigation.
 * Styling is limited to the site's plain text control (no fill, border, radius
 * or custom arrow), so it matches the rest of the page.
 */
export type SystemSelectOption = { value: string; label: string };

type SystemSelectProps = {
  value: string;
  options: readonly SystemSelectOption[];
  onChange: (value: string) => void;
  /** Accessible name; the native control has no visible label of its own. */
  ariaLabel: string;
};

export function SystemSelect({ value, options, onChange, ariaLabel }: SystemSelectProps) {
  return (
    <select
      className="control"
      value={value}
      aria-label={ariaLabel}
      data-reveal
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
