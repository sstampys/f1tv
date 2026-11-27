import { Dropdown, type DropdownOption } from "@/components/Dropdown";

/**
 * Plain-text dropdown built on the site's single Dropdown element.
 * Keeps the officecommun.com look: no flags, emojis, pills, blur or borders —
 * just the current value and a list of names with optional right-aligned codes.
 * Defaults to language short codes (EN/ES/DE/IT/SV/NL) matching SourceLanguage.code,
 * but accepts any options for seasons, stream sources, etc.
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

export function LanguageSelectorDropdown({
  value,
  options = LANGUAGE_OPTIONS,
  onChange,
  ariaLabel = "Select language",
  align = "start",
}: LanguageSelectorDropdownProps) {
  return (
    <Dropdown
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel={ariaLabel}
      align={align}
    />
  );
}
