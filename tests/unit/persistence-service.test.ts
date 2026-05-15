import "./setup-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FolioDB } from "@/lib/db/folio-db";
import { PersistenceService, createEmptyProject } from "@/lib/persistence/persistence-service";
import type { ImageElement, Project, TextElement } from "@/lib/db/schema";

function freshDb(): FolioDB {
  // Unique DB name per test isolates fake-indexeddb state.
  return new FolioDB(`folio-test-${crypto.randomUUID()}`);
}

function fakeImageElement(assetKey: string): ImageElement {
  return {
    id: crypto.randomUUID(),
    kind: "image",
    assetKey,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    z: 0,
  };
}

function fakeTextElement(): TextElement {
  return {
    id: crypto.randomUUID(),
    kind: "text",
    text: "hello",
    fontFamily: "Inter",
    fontSize: 32,
    color: "#fff",
    align: "left",
    x: 10,
    y: 10,
    width: 200,
    height: 40,
    rotation: 0,
    z: 1,
  };
}

describe("PersistenceService — projects", () => {
  let db: FolioDB;
  let svc: PersistenceService;

  beforeEach(() => {
    db = freshDb();
    svc = new PersistenceService(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("saves and loads a project verbatim", async () => {
    const project: Project = createEmptyProject({
      name: "First",
      presetId: "ig-square",
      slideCount: 3,
    });
    await svc.saveProject(project);
    const loaded = await svc.getProject(project.id);
    expect(loaded).toEqual(project);
  });

  it("returns null for a missing project", async () => {
    const result = await svc.getProject("does-not-exist");
    expect(result).toBeNull();
  });

  it("lists projects newest-updated first", async () => {
    const older = createEmptyProject({
      name: "Older",
      presetId: "ig-square",
      slideCount: 3,
    });
    const newer = createEmptyProject({
      name: "Newer",
      presetId: "tiktok-cover",
      slideCount: 1,
    });
    newer.updatedAt = older.updatedAt + 1_000;

    await svc.saveProject(older);
    await svc.saveProject(newer);

    const summaries = await svc.listProjects();
    expect(summaries.map((s) => s.name)).toEqual(["Newer", "Older"]);
    expect(summaries[0]).toMatchObject({ id: newer.id, presetId: "tiktok-cover" });
    // Summary must not leak full project fields like elements.
    expect((summaries[0] as unknown as Record<string, unknown>).elements).toBeUndefined();
  });

  it("deletes a project", async () => {
    const project = createEmptyProject({
      name: "Doomed",
      presetId: "ig-square",
      slideCount: 3,
    });
    await svc.saveProject(project);
    await svc.deleteProject(project.id);
    expect(await svc.getProject(project.id)).toBeNull();
    expect(await svc.listProjects()).toEqual([]);
  });

  it("duplicates a project with new ids and a derived name", async () => {
    const original = createEmptyProject({
      name: "Source",
      presetId: "linkedin-carousel",
      slideCount: 5,
    });
    original.elements = [fakeTextElement(), fakeImageElement("asset-1")];
    await svc.saveProject(original);

    const copyId = await svc.duplicateProject(original.id);
    expect(copyId).not.toBe(original.id);

    const copy = await svc.getProject(copyId);
    expect(copy).not.toBeNull();
    expect(copy?.name).toBe("Source (copy)");
    expect(copy?.elements).toHaveLength(2);
    for (const el of copy?.elements ?? []) {
      expect(original.elements.find((o) => o.id === el.id)).toBeUndefined();
    }
    // Shared assets — element references the same asset key.
    const dupedImage = copy?.elements.find((e) => e.kind === "image");
    expect(dupedImage?.kind === "image" ? dupedImage.assetKey : null).toBe("asset-1");
  });

  it("increments the copy counter when duplicating again", async () => {
    const p = createEmptyProject({ name: "Source", presetId: "ig-square", slideCount: 3 });
    await svc.saveProject(p);
    const c1 = await svc.duplicateProject(p.id);
    const c2 = await svc.duplicateProject(c1);
    const c3 = await svc.duplicateProject(c2);

    const names = (
      await Promise.all([svc.getProject(c1), svc.getProject(c2), svc.getProject(c3)])
    ).map((x) => x?.name);
    expect(names).toEqual(["Source (copy)", "Source (copy 2)", "Source (copy 3)"]);
  });
});

describe("PersistenceService — assets", () => {
  let db: FolioDB;
  let svc: PersistenceService;

  beforeEach(() => {
    db = freshDb();
    svc = new PersistenceService(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it("stores and retrieves an asset", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const asset = await svc.putAsset(blob, "image/png", 100, 100);
    const loaded = await svc.getAsset(asset.id);
    expect(loaded?.id).toBe(asset.id);
    expect(loaded?.mime).toBe("image/png");
    expect(loaded?.width).toBe(100);
  });

  it("returns null for a missing asset", async () => {
    expect(await svc.getAsset("nope")).toBeNull();
  });
});

describe("PersistenceService — gcOrphanedAssets", () => {
  let db: FolioDB;
  let svc: PersistenceService;

  beforeEach(() => {
    db = freshDb();
    svc = new PersistenceService(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  async function seedAsset(): Promise<string> {
    const blob = new Blob([new Uint8Array([0])], { type: "image/png" });
    const asset = await svc.putAsset(blob, "image/png", 1, 1);
    return asset.id;
  }

  it("deletes assets not referenced by any project", async () => {
    const orphan = await seedAsset();
    const kept = await seedAsset();

    const project = createEmptyProject({
      name: "Has image",
      presetId: "ig-square",
      slideCount: 3,
    });
    project.elements = [fakeImageElement(kept)];
    await svc.saveProject(project);

    const deleted = await svc.gcOrphanedAssets();
    expect(deleted).toBe(1);
    expect(await svc.getAsset(orphan)).toBeNull();
    expect(await svc.getAsset(kept)).not.toBeNull();
  });

  it("keeps assets referenced by a thumbnailKey", async () => {
    const thumb = await seedAsset();
    const project = createEmptyProject({
      name: "Has thumb",
      presetId: "ig-square",
      slideCount: 3,
    });
    project.thumbnailKey = thumb;
    await svc.saveProject(project);

    const deleted = await svc.gcOrphanedAssets();
    expect(deleted).toBe(0);
    expect(await svc.getAsset(thumb)).not.toBeNull();
  });

  it("returns 0 when there are no orphans", async () => {
    const used = await seedAsset();
    const project = createEmptyProject({
      name: "All clean",
      presetId: "ig-square",
      slideCount: 3,
    });
    project.elements = [fakeImageElement(used)];
    await svc.saveProject(project);

    expect(await svc.gcOrphanedAssets()).toBe(0);
  });

  it("ignores non-image elements when computing references", async () => {
    const orphan = await seedAsset();
    const project = createEmptyProject({
      name: "Text only",
      presetId: "ig-square",
      slideCount: 3,
    });
    project.elements = [fakeTextElement()];
    await svc.saveProject(project);

    const deleted = await svc.gcOrphanedAssets();
    expect(deleted).toBe(1);
    expect(await svc.getAsset(orphan)).toBeNull();
  });
});
