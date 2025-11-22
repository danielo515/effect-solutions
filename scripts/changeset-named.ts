#!/usr/bin/env bun
import { readdir, rename } from "node:fs/promises";
import { join } from "node:path";

const name = process.argv[2];

if (!name) {
  console.error("Usage: bun changeset:named <name>");
  process.exit(1);
}

const changesetDir = ".changeset";

// List existing changesets before running changeset
const beforeFiles = new Set(await readdir(changesetDir));

// Run changeset in foreground - user completes it interactively
const proc = Bun.spawn(["bunx", "changeset", "add"], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

await proc.exited;

if (proc.exitCode !== 0) {
  process.exit(proc.exitCode);
}

// Find the newly created file
const afterFiles = await readdir(changesetDir);
const newFile = afterFiles.find(
  (file: string) => !beforeFiles.has(file) && file.endsWith(".md"),
);

if (!newFile) {
  console.error("No new changeset file found");
  process.exit(1);
}

// Rename to custom name
const kebabName = name.replace(/\s+/g, "-").toLowerCase();
const targetName = `${kebabName}.md`;
const oldPath = join(changesetDir, newFile);
const newPath = join(changesetDir, targetName);

await rename(oldPath, newPath);
console.log(`\n✅ Created changeset: ${targetName}`);
