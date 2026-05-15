import { CURRENT_SCHEMA_VERSION, type Project, type SchemaVersion } from "@/lib/db/schema";

/**
 * Migrate a project loaded from storage forward to the current schema.
 *
 * Each entry handles a single version step (e.g. 1 → 2). v1 is the
 * launch schema, so there are no migrations yet — the function is
 * still wired through so adding future versions is a one-line change
 * here, not a search-and-replace across the codebase.
 */
type Migration = (project: Project) => Project;

const MIGRATIONS: Partial<Record<number, Migration>> = {
  // 1: (project) => migrateV1toV2(project),
};

export function migrateProject(input: Project): Project {
  let project = input;
  while (project.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[project.schemaVersion];
    if (!step) {
      throw new Error(
        `No migration registered from schema v${project.schemaVersion} → v${
          project.schemaVersion + 1
        }`,
      );
    }
    project = step(project);
  }
  return project;
}

export function isCurrentSchema(version: number): version is SchemaVersion {
  return version === CURRENT_SCHEMA_VERSION;
}
