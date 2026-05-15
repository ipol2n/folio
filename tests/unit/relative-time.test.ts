import { describe, expect, it } from "vitest";
import { relativeTime } from "@/lib/format/relative-time";

describe("relativeTime", () => {
  const now = new Date("2026-05-15T12:00:00Z").getTime();

  it("reports 'just now' for sub-45s deltas in either direction", () => {
    expect(relativeTime(now, now)).toBe("just now");
    expect(relativeTime(now - 30_000, now)).toBe("just now");
    expect(relativeTime(now + 30_000, now)).toBe("just now");
  });

  it("formats minutes ago", () => {
    expect(relativeTime(now - 2 * 60_000, now)).toMatch(/2 minutes ago/);
  });

  it("formats hours ago", () => {
    expect(relativeTime(now - 3 * 60 * 60_000, now)).toMatch(/3 hours ago/);
  });

  it("formats yesterday", () => {
    expect(relativeTime(now - 24 * 60 * 60_000, now)).toMatch(/yesterday/i);
  });

  it("formats days ago", () => {
    expect(relativeTime(now - 5 * 24 * 60 * 60_000, now)).toMatch(/5 days ago/);
  });

  it("formats months ago", () => {
    expect(relativeTime(now - 90 * 24 * 60 * 60_000, now)).toMatch(/3 months ago/);
  });

  it("formats future times with 'in …'", () => {
    expect(relativeTime(now + 5 * 60_000, now)).toMatch(/in 5 minutes/);
  });
});
