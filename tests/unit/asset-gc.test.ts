import "./setup-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FolioDB } from "@/lib/db/folio-db";
import { PersistenceService, createEmptyProject } from "@/lib/persistence/persistence-service";
import { __resetAssetGcForTests, runAssetGcOnce } from "@/lib/persistence/asset-gc";

describe("runAssetGcOnce", () => {
  let db: FolioDB;
  let svc: PersistenceService;

  beforeEach(() => {
    db = new FolioDB(`folio-gc-${crypto.randomUUID()}`);
    svc = new PersistenceService(db);
    __resetAssetGcForTests();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("runs the GC once and caches the result", async () => {
    const orphanBlob = new Blob([new Uint8Array([1])], { type: "image/png" });
    await svc.putAsset(orphanBlob, "image/png", 1, 1);

    const first = await runAssetGcOnce({ service: svc, bargeInWindowMs: 10 });
    expect(first).toBe(1);

    // Subsequent calls in the same "load" should be no-ops.
    const second = await runAssetGcOnce({ service: svc, bargeInWindowMs: 10 });
    expect(second).toBe(0);
  });

  it("returns 0 when there are no orphans", async () => {
    const project = createEmptyProject({
      name: "Empty",
      presetId: "ig-square",
      slideCount: 3,
    });
    await svc.saveProject(project);
    const result = await runAssetGcOnce({ service: svc, bargeInWindowMs: 10 });
    expect(result).toBe(0);
  });
});
