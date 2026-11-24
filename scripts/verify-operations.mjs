import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontend = fileURLToPath(new URL("..", import.meta.url));
const backend = path.resolve(process.env.WATCHTOWER_BACKEND_PATH || path.join(frontend, "..", "crossworld_backend"));
const profile = process.argv[2] || "frontend";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const frontendChecks = [
  { project: "frontend", name: "Operations lint", args: ["exec", "--", "eslint", "src/Pages/Operations"] },
  { project: "frontend", name: "Frontend production build", args: ["run", "build"] },
];
const backendChecks = [
  { project: "backend", name: "Backend fast suite", args: ["run", "test:fast"] },
  { project: "backend", name: "Operations and Squash integration", args: [
    "--test", "tests/integration/operations-*.test.mjs", "tests/http/shared-router-contracts.test.mjs",
    "tools/operations-worker/supervisor.test.mjs",
  ], executable: process.execPath },
];
const profiles = { frontend: frontendChecks, backend: backendChecks, release: [...frontendChecks, ...backendChecks] };

function git(cwd, ...args) {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
}

function identity(cwd) {
  const files = [...new Set(git(cwd, "ls-files", "-z", "--cached", "--others", "--exclude-standard").split("\0").filter(Boolean))].sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const fullPath = path.join(cwd, file);
    const info = lstatSync(fullPath, { throwIfNoEntry: false });
    hash.update(JSON.stringify([file, info?.isFile() ? "file" : info?.isSymbolicLink() ? "symlink" : "absent"]));
    if (info?.isFile()) hash.update(createHash("sha256").update(readFileSync(fullPath)).digest());
    if (info?.isSymbolicLink()) hash.update(JSON.stringify(readlinkSync(fullPath)));
  }
  return { commit: git(cwd, "rev-parse", "HEAD").trim(), contentSha256: hash.digest("hex"),
    clean: !git(cwd, "status", "--porcelain", "--untracked-files=normal").trim() };
}

const checks = profiles[profile];
if (!Array.isArray(checks)) throw new Error("Choose frontend, backend, or release.");
const repositories = { frontend, backend };
const projects = [...new Set(checks.map(check => check.project))];
const snapshot = () => Object.fromEntries(projects.map(project => [project, identity(repositories[project])]));
const before = snapshot();
const startedAt = new Date().toISOString();
const results = [];
for (const check of checks) {
  const start = Date.now();
  const cmd = check.executable || npm;
  const result = spawnSync(cmd, check.args, {
    cwd: repositories[check.project], stdio: "inherit", shell: !check.executable && process.platform === "win32",
  });
  const elapsedMs = Date.now() - start;
  results.push({ name: check.name, project: check.project, exitCode: result.status, signal: result.signal, elapsedMs,
    ...(result.error && { error: result.error.code }) });
  console.log(check.name + (result.status === 0 ? " passed" : " failed") + " in " + elapsedMs + " ms");
}
const after = snapshot();
const stable = JSON.stringify(before) === JSON.stringify(after);
const passed = stable && results.every(result => result.exitCode === 0);
const directory = path.resolve(process.env.WATCHTOWER_EVIDENCE_DIR || path.join(os.tmpdir(), "crossworld-verification"));
mkdirSync(directory, { recursive: true });
const receipt = path.join(directory, startedAt.replaceAll(":", "-") + "-" + process.pid + ".json");
writeFileSync(receipt, JSON.stringify({ profile, startedAt, completedAt: new Date().toISOString(),
  environment: { platform: process.platform, node: process.version }, stable, passed, before, after, results,
  matchesCommittedCandidate: passed && Object.values(before).every(project => project.clean) }, null, 2) + "\n", { flag: "wx" });
console.log("Verification receipt " + receipt);
if (!stable) console.error("Sources changed while verification was running. Run verification again for the candidate.");
process.exitCode = Number(!passed);
