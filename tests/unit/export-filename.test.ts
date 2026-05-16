import { describe, expect, it } from "vitest";
import {
  extensionForMime,
  sanitizeFilenameBase,
  slideFilename,
  zipFilename,
} from "@/lib/export/filename";

describe("sanitizeFilenameBase", () => {
  it("preserves a normal name", () => {
    expect(sanitizeFilenameBase("My Post")).toBe("My Post");
  });

  it("falls back to 'untitled' when given whitespace", () => {
    expect(sanitizeFilenameBase("   ")).toBe("untitled");
    expect(sanitizeFilenameBase("")).toBe("untitled");
  });

  it("strips path separators and disallowed punctuation", () => {
    expect(sanitizeFilenameBase("foo/bar:baz<qux>?")).toBe("foo-bar-baz-qux--");
  });

  it("caps overly long names", () => {
    const long = "a".repeat(200);
    expect(sanitizeFilenameBase(long).length).toBe(80);
  });
});

describe("slideFilename", () => {
  it("formats `{name}-{slide+1}.{ext}`", () => {
    expect(slideFilename("Sunday teaser", 0, "png")).toBe("Sunday teaser-1.png");
    expect(slideFilename("Sunday teaser", 2, "jpg")).toBe("Sunday teaser-3.jpg");
  });

  it("uses sanitized name in the prefix", () => {
    expect(slideFilename("a/b", 0, "png")).toBe("a-b-1.png");
  });
});

describe("zipFilename", () => {
  it("formats `{name}.zip`", () => {
    expect(zipFilename("Big project")).toBe("Big project.zip");
  });
});

describe("extensionForMime", () => {
  it("maps PNG and JPEG", () => {
    expect(extensionForMime("image/png")).toBe("png");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
  });
});
