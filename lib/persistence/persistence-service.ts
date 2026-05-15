import { getDb, type FolioDB } from "@/lib/db/folio-db";
import {
  CURRENT_SCHEMA_VERSION,
  type Asset,
  type Element,
  type Project,
  type ProjectSummary,
} from "@/lib/db/schema";
import { migrateProject } from "./migrations";

/**
 * High-level data access for projects and assets. Mirrors the
 * `PersistenceService` interface in docs/DESIGN.md §11.1.
 *
 * The DB handle is injected so the same implementation runs against a
 * real IndexedDB in the browser and `fake-indexeddb` in tests.
 */
export class PersistenceService {
  constructor(private readonly db: FolioDB = getDb()) {}

  // ── Projects ──────────────────────────────────────────────────────────────

  async listProjects(): Promise<ProjectSummary[]> {
    const rows = await this.db.projects.orderBy("updatedAt").reverse().toArray();
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      updatedAt: p.updatedAt,
      presetId: p.presetId,
      thumbnailKey: p.thumbnailKey,
    }));
  }

  async getProject(id: string): Promise<Project | null> {
    const row = await this.db.projects.get(id);
    if (!row) return null;
    return migrateProject(row);
  }

  async saveProject(project: Project): Promise<void> {
    await this.db.projects.put(project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.db.projects.delete(id);
  }

  async duplicateProject(id: string): Promise<string> {
    const source = await this.getProject(id);
    if (!source) throw new Error(`Project ${id} not found`);
    const now = Date.now();
    const copy: Project = {
      ...source,
      id: newId(),
      name: derivedCopyName(source.name),
      createdAt: now,
      updatedAt: now,
      // Assets are shared by key — duplicating a project must NOT copy blobs.
      elements: source.elements.map((el) => ({ ...el, id: newId() })),
    };
    await this.db.projects.put(copy);
    return copy.id;
  }

  // ── Assets ────────────────────────────────────────────────────────────────

  async putAsset(blob: Blob, mime: string, width: number, height: number): Promise<Asset> {
    const asset: Asset = {
      id: newId(),
      blob,
      mime,
      width,
      height,
      createdAt: Date.now(),
    };
    await this.db.assets.put(asset);
    return asset;
  }

  async getAsset(id: string): Promise<Asset | null> {
    const row = await this.db.assets.get(id);
    return row ?? null;
  }

  /**
   * Delete any asset that isn't referenced by a current project's
   * elements or thumbnail. Returns the number of assets deleted.
   */
  async gcOrphanedAssets(): Promise<number> {
    const projects = await this.db.projects.toArray();
    const referenced = new Set<string>();
    for (const p of projects) {
      if (p.thumbnailKey) referenced.add(p.thumbnailKey);
      for (const el of p.elements) {
        if (isImageElement(el)) referenced.add(el.assetKey);
      }
    }

    const orphans: string[] = [];
    await this.db.assets.each((asset) => {
      if (!referenced.has(asset.id)) orphans.push(asset.id);
    });

    if (orphans.length > 0) await this.db.assets.bulkDelete(orphans);
    return orphans.length;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isImageElement(el: Element): el is Extract<Element, { kind: "image" }> {
  return el.kind === "image";
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Vanishingly unlikely in supported envs (Node 22, modern browsers).
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function derivedCopyName(name: string): string {
  const m = name.match(/^(.*) \(copy(?: (\d+))?\)$/);
  if (!m) return `${name} (copy)`;
  const next = m[2] ? Number(m[2]) + 1 : 2;
  return `${m[1]} (copy ${next})`;
}

// ── Factory helpers ────────────────────────────────────────────────────────

export interface NewProjectInput {
  name: string;
  presetId: Project["presetId"];
  slideCount: number;
}

export function createEmptyProject(input: NewProjectInput): Project {
  const now = Date.now();
  return {
    id: newId(),
    name: input.name,
    presetId: input.presetId,
    slideCount: input.slideCount,
    elements: [],
    background: { kind: "solid", color: "#0B0B0F" },
    createdAt: now,
    updatedAt: now,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}

// Singleton accessor for app code. Tests construct their own instance.
let appService: PersistenceService | null = null;
export function getPersistenceService(): PersistenceService {
  if (!appService) appService = new PersistenceService();
  return appService;
}

export function __resetPersistenceServiceForTests(): void {
  appService = null;
}
