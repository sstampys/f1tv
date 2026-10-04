import { describe, expect, test } from "bun:test";
import { getSourceLanguage } from "./source-language";

describe("broadcast language identification", () => {
  for (const [locale, flag, name] of [
    ["de", "🇩🇪", "Deutsch"],
    ["it", "🇮🇹", "Italiano"],
    ["en-gb", "🇬🇧", "English"],
    ["en-us", "🇺🇸", "English"],
    ["es", "🇪🇸", "Español"],
    ["sv", "🇸🇪", "Svenska"],
    ["nl", "🇳🇱", "Nederlands"],
  ]) {
    test(`PPV locale ${locale} identifies numeric embed URLs`, () => {
      expect(getSourceLanguage("Sky Sport F1", "https://example.com/live/29724", locale)).toEqual({ flag, name });
    });
  }
  test("explicit locale overrides a conflicting URL hint", () => {
    expect(getSourceLanguage("Sky Sport F1", "https://example.com/feed-de", "it")).toEqual({ flag: "🇮🇹", name: "Italiano" });
  });
  test("locale accepts regional codes and normalized capitalization", () => {
    expect(getSourceLanguage("Default", "https://example.com/feed", " EN_US ")).toEqual({ flag: "🇺🇸", name: "English" });
  });
  test("unknown locale retains recognized channel fallback", () => {
    expect(getSourceLanguage("DAZN F1", "https://example.com/feed", "unknown")).toEqual({ flag: "🇪🇸", name: "Español" });
  });
  for (const [label, flag, name] of [
    ["Sky Sports F1", "🇬🇧", "English"],
    ["Apple TV (F1TV)", "🇺🇸", "English"],
    ["DAZN F1", "🇪🇸", "Español"],
    ["V Sport Motor", "🇸🇪", "Svenska"],
    ["Viaplay", "🇳🇱", "Nederlands"],
  ]) {
    test(label, () => {
      expect(getSourceLanguage(label, "https://example.com/feed")).toEqual({ flag, name });
    });
  }
  test("German Sky Sport is identified from its source URL", () => {
    expect(getSourceLanguage("Sky Sport F1", "https://example.com/sky-sport-f1-de")).toEqual({ flag: "🇩🇪", name: "Deutsch" });
  });
  test("Italian Sky Sport is identified independently", () => {
    expect(getSourceLanguage("Sky Sport F1", "https://example.com/sky-sport-f1-it")).toEqual({ flag: "🇮🇹", name: "Italiano" });
  });
  test("ambiguous Sky Sport does not receive a guessed language", () => {
    expect(getSourceLanguage("Sky Sport F1", "https://example.com/feed")).toBeNull();
  });
});