import { readFileSync, writeFileSync } from "node:fs";

const lockfilePath = "package-lock.json";
const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
const internalHosts = new Set([
  "package-firewall.replit.local",
  "package-firewall.replit.internal",
]);

if (!lockfile.packages || typeof lockfile.packages !== "object") {
  throw new Error("package-lock.json does not contain a packages map");
}

let normalized = 0;

for (const [name, entry] of Object.entries(lockfile.packages)) {
  if (!entry.resolved) continue;

  const url = new URL(entry.resolved);
  if (!internalHosts.has(url.hostname)) continue;
  if (!url.pathname.startsWith("/npm/")) {
    throw new Error(`Unexpected package proxy path for ${name}`);
  }
  if (!entry.integrity) {
    throw new Error(`Missing integrity hash for ${name}`);
  }

  entry.resolved = `https://registry.npmjs.org/${url.pathname.slice(5)}${url.search}`;
  normalized += 1;
}

writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
console.log(`Normalized ${normalized} internal package URLs; integrity hashes preserved.`);
