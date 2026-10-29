import type { StartupReadiness } from './health';

export function createStartupReadiness(): StartupReadiness {
  return { schemaReady: false };
}

export function shouldSeedDemoData(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'test';
}

export async function initializeDatabase(
  initializeSchema: () => Promise<void>,
  readiness: StartupReadiness,
): Promise<void> {
  readiness.schemaReady = false;
  await initializeSchema();
  readiness.schemaReady = true;
}
