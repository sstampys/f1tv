export type SourceLanguage = { flag: string; name: string };

const languages = {
  enGB: { flag: "🇬🇧", name: "English" },
  enUS: { flag: "🇺🇸", name: "English" },
  es: { flag: "🇪🇸", name: "Español" },
  de: { flag: "🇩🇪", name: "Deutsch" },
  it: { flag: "🇮🇹", name: "Italiano" },
  sv: { flag: "🇸🇪", name: "Svenska" },
  nl: { flag: "🇳🇱", name: "Nederlands" },
} satisfies Record<string, SourceLanguage>;

// PPV's explicit locale takes priority; region hints are a fallback.
// Never infer a language from source order.
export function getSourceLanguage(label: string, src: string, locale?: string | null): SourceLanguage | null {
  const code = locale?.trim().toLowerCase().replace(/_/g, "-");
  if (code) {
    const [language, region] = code.split("-");
    if (language === "de") return languages.de;
    if (language === "it") return languages.it;
    if (language === "es") return languages.es;
    if (language === "sv") return languages.sv;
    if (language === "nl") return languages.nl;
    if (language === "en") return region === "us" ? languages.enUS : languages.enGB;
  }
  const hints = `${label} ${src}`.toLowerCase();
  if (/\b(german|deutsch|germany|de)\b/.test(hints)) return languages.de;
  if (/\b(italian|italiano|italy|it)\b/.test(hints)) return languages.it;
  if (/\b(spanish|español|spain|es)\b/.test(hints)) return languages.es;
  if (/\b(swedish|svenska|sweden|se|sv)\b/.test(hints)) return languages.sv;
  if (/\b(dutch|nederlands|netherlands|nl)\b/.test(hints)) return languages.nl;
  if (/\b(english|uk|gb)\b/.test(hints)) return languages.enGB;
  if (/\b(us|usa)\b/.test(hints)) return languages.enUS;
  if (/sky\s*sports/i.test(label)) return languages.enGB;
  if (/apple\s*tv|appletv|\batv\b/i.test(label)) return languages.enUS;
  if (/dazn\s*f1/i.test(label)) return languages.es;
  if (/v\s*sport\s*motor/i.test(label)) return languages.sv;
  if (/viaplay/i.test(label)) return languages.nl;
  return null;
}