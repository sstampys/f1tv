import { describe, expect, test } from "bun:test";
import { menuGeometry, type MenuRect } from "./menu-geometry";

const rect = (
  left: number,
  top: number,
  width: number,
  height: number,
): MenuRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

const base = {
  viewportWidth: 1440,
  viewportHeight: 900,
  gutter: 40,
  offset: 8,
  container: rect(388, 0, 664, 900),
  trigger: rect(950, 300, 100, 24),
  naturalWidth: 180,
  naturalHeight: 320,
  align: "end" as const,
};

describe("menuGeometry", () => {
  test("aligns the end edge to the trigger and opens below", () => {
    const g = menuGeometry(base);
    expect(g.placement).toBe("below");
    expect(g.width).toBe(180);
    expect(g.left).toBe(950 + 100 - 180);
    expect(g.top).toBe(300 + 24 + 8);
    expect(g.maxHeight).toBe(320);
  });

  test("aligns the start edge to the trigger", () => {
    const g = menuGeometry({ ...base, align: "start" });
    expect(g.left).toBe(950);
  });

  test("never crosses the container's left edge", () => {
    const g = menuGeometry({
      ...base,
      trigger: rect(420, 300, 60, 24),
      naturalWidth: 300,
      align: "end",
    });
    expect(g.left).toBe(388);
    expect(g.left + g.width).toBeLessThanOrEqual(664 + 388);
  });

  test("never crosses the container's right edge", () => {
    const g = menuGeometry({
      ...base,
      trigger: rect(1000, 300, 40, 24),
      naturalWidth: 300,
      align: "start",
    });
    expect(g.left + g.width).toBeLessThanOrEqual(388 + 664);
  });

  test("is never wider than the container", () => {
    const g = menuGeometry({ ...base, naturalWidth: 2000 });
    expect(g.width).toBe(664);
  });

  test("is never wider than the viewport minus both gutters", () => {
    const g = menuGeometry({
      ...base,
      container: rect(0, 0, 375, 900),
      trigger: rect(200, 300, 100, 24),
      viewportWidth: 375,
      gutter: 16,
      naturalWidth: 2000,
      align: "end",
    });
    expect(g.width).toBe(375 - 32);
    expect(g.left).toBe(16);
  });

  test("flips above when there is no room below", () => {
    const g = menuGeometry({
      ...base,
      trigger: rect(950, 800, 100, 24),
      naturalHeight: 300,
    });
    expect(g.placement).toBe("above");
    expect(g.top + g.maxHeight).toBe(800 - 8);
    expect(g.top).toBeGreaterThanOrEqual(40);
  });

  test("stays below when above is smaller", () => {
    const g = menuGeometry({
      ...base,
      trigger: rect(950, 60, 100, 24),
      naturalHeight: 300,
    });
    expect(g.placement).toBe("below");
    expect(g.maxHeight).toBe(900 - 84 - 8 - 40);
  });

  test("caps the height to the available space on the chosen side", () => {
    const g = menuGeometry({
      ...base,
      trigger: rect(950, 700, 100, 24),
      naturalHeight: 900,
    });
    expect(g.placement).toBe("above");
    expect(g.maxHeight).toBe(700 - 8 - 40);
    expect(g.top).toBe(40);
  });

  test("keeps the menu inside the viewport when space is very tight", () => {
    const g = menuGeometry({
      ...base,
      viewportHeight: 200,
      trigger: rect(950, 150, 100, 24),
      naturalHeight: 400,
      gutter: 16,
    });
    expect(g.top).toBeGreaterThanOrEqual(16);
    expect(g.top + g.maxHeight).toBeLessThanOrEqual(200 - 16);
  });
});
