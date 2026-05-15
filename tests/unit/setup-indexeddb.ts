/**
 * Activate fake-indexeddb for unit tests that exercise Dexie.
 * Import this file once per test file (or via vitest.setup) before
 * any Dexie code touches `indexedDB`.
 */
import "fake-indexeddb/auto";
