import { describe, expect, test } from "bun:test";
import { getSourceLanguage } from "./source-language";

describe("broadcast language identification", () => {
  for (const [locale, flag, name, code] of [
    ["de", "🇩🇪", "Deutsch", "DE"],
    ["it", "🇮🇹", "Italiano", "IT"],
    ["en-gb", "🇬🇧", "English", "EN"],
    ["en-us", "🇺🇸", "English", "EN"],
    ["es", "🇪🇸", "Español", "ES"],
    ["sv", "🇸🇪", "Svenska", "SV"],
    ["nl", "🇳🇱", "Nederlands", "NL"],
  ]) {
    test(`PPV locale ${locale} identifies numeric embed URLs`, () => {
      expect(getSourceLanguage("Sky Sport F1", "https://example.com/live/29724", locale)).toEqual({ flag, name, code });
    });
  }
  test("explicit locale overrides a conflicting URL hint", () => {
    expect(getSourceLanguage("Sky Sport F1", "https://example.com/feed-de", "it")).toEqual({ flag: "🇮🇹", name: "Italiano", code: "IT" });
  });
  test("locale accepts regional codes and normalized capitalization", () => {
    expect(getSourceLanguage("Default", "https://example.com/feed", " EN_US ")).toEqual({ flag: "🇺🇸", name: "English", code: "EN" });
  });
  test("unknown locale retains recognized channel fallback", () => {
    expect(getSourceLanguage("DAZN F1", "https://example.com/feed", "unknown")).toEqual({ flag: "🇪🇸", name: "Español", code: "ES" });
  });
  for (const [label, flag, name, code] of [
    ["Sky Sports F1", "🇬🇧", "English", "EN"],
    ["Apple TV (F1TV)", "🇺🇸", "English", "EN"],
    ["DAZN F1", "🇪🇸", "Español", "ES"],
    ["V Sport Motor", "🇸🇪", "Svenska", "SV"],
    ["Viaplay", "🇳🇱", "Nederlands", "NL"],
  ]) {
    test(label, () => {
      expect(getSourceLanguage(label, "https://example.com/feed")).toEqual({ flag, name, code });
    });
  }
  test("German Sky Sport is identified from its source URL", () => {
    expect(getSourceLanguage("Sky Sport F1", "https://example.com/sky-sport-f1-de")).toEqual({ flag: "🇩🇪", name: "Deutsch", code: "DE" });
  });
  test("Italian Sky Sport is identified independently", () => {
    expect(getSourceLanguage("Sky Sport F1", "https://example.com/sky-sport-f1-it")).toEqual({ flag: "🇮🇹", name: "Italiano", code: "IT" });
  });
  test("ambiguous Sky Sport does not receive a guessed language", () => {
    expect(getSourceLanguage("Sky Sport F1", "https://example.com/feed")).toBeNull();
  });
});
