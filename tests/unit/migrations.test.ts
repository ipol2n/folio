import { describe, expect, it } from "vitest";
import { isCurrentSchema, migrateProject } from "@/lib/persistence/migrations";
import { CURRENT_SCHEMA_VERSION } from "@/lib/db/schema";
import { createEmptyProject } from "@/lib/persistence/persistence-service";

describe("migrations", () => {
  it("isCurrentSchema reports current version", () => {
    expect(isCurrentSchema(CURRENT_SCHEMA_VERSION)).toBe(true);
    expect(isCurrentSchema(CURRENT_SCHEMA_VERSION + 1)).toBe(false);
    expect(isCurrentSchema(0)).toBe(false);
  });

  it("migrateProject is identity for current-schema projects", () => {
    const project = createEmptyProject({
      name: "Today",
      presetId: "ig-square",
      slideCount: 3,
    });
    expect(migrateProject(project)).toEqual(project);
  });

  it("migrateProject is idempotent", () => {
    const project = createEmptyProject({
      name: "Today",
      presetId: "ig-square",
      slideCount: 3,
    });
    const once = migrateProject(project);
    const twice = migrateProject(once);
    expect(twice).toEqual(once);
  });

  it("throws when no migration is registered for an older schema", () => {
    const project = createEmptyProject({
      name: "Past",
      presetId: "ig-square",
      slideCount: 3,
    });
    // Force-cast a fake older version. The real type permits only
    // `SchemaVersion`, but this scenario simulates a future where
    // someone bumps CURRENT_SCHEMA_VERSION without registering the
    // step migration — the function must fail loudly rather than
    // silently return stale data.
    const stale = { ...project, schemaVersion: 0 } as unknown as typeof project;
    expect(() => migrateProject(stale)).toThrow(/migration registered/i);
  });
});
