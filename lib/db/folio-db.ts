import Dexie, { type Table } from "dexie";
import type { Asset, Project } from "./schema";

/**
 * Dexie wrapper for Folio's local store. Two tables:
 *  - projects: JSON state; thumbnailKey references an asset.
 *  - assets:   binary blobs (uploaded images, generated thumbnails).
 *
 * Splitting keeps the project list cheap to render — it never has to
 * touch blob bytes — and lets the editor's undo stack reference assets
 * by id instead of cloning them.
 */
export class FolioDB extends Dexie {
  projects!: Table<Project, string>;
  assets!: Table<Asset, string>;

  constructor(databaseName = "folio") {
    super(databaseName);
    this.version(1).stores({
      projects: "id, updatedAt, presetId",
      assets: "id, createdAt",
    });
  }
}

let singleton: FolioDB | null = null;

/**
 * Lazily resolve the shared DB instance. IndexedDB only exists in the
 * browser, so this guards SSR / unit-test environments without one.
 */
export function getDb(): FolioDB {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment");
  }
  if (!singleton) singleton = new FolioDB();
  return singleton;
}

/** Reset the singleton — primarily for tests, never call from app code. */
export function __resetDbSingletonForTests(): void {
  singleton = null;
}
