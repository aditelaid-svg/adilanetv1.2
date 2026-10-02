import { readFile } from "node:fs/promises";
import path from "node:path";

/** Add missing payment tables without replacing existing data or reservations. */
export async function ensureQiospaySchema(db: { query: (sql: string) => Promise<unknown> }) {
  let schema: string;
  try {
    schema = await readFile(path.resolve(process.cwd(), "src/server/qiospay-schema.sql"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    // Docker ships dist, not the source tree. The build includes this SQL asset.
    schema = await readFile(path.resolve(process.cwd(), "dist/qiospay-schema.sql"), "utf8");
  }
  await db.query(schema);
}