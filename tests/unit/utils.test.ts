import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false, undefined, null, 0, "", "b")).toBe("a b");
  });

  it("dedupes conflicting tailwind classes by keeping the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("merges conditional class objects", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
