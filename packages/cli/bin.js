#!/usr/bin/env node

// Chooses the right precompiled binary for the current platform/arch.
// Falls back to an error message telling the user how to proceed.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLATFORM_ARCH = `${process.platform}-${process.arch}`;

const TARGET_MAP = {
  "darwin-arm64": "effect-solutions-darwin-arm64",
  "darwin-x64": "effect-solutions-darwin-x64",
  "linux-x64": "effect-solutions-linux-x64",
  "linux-arm64": "effect-solutions-linux-arm64",
};

const binaryName = TARGET_MAP[PLATFORM_ARCH];

if (!binaryName) {
  console.error(
    `[effect-solutions] Unsupported platform: ${PLATFORM_ARCH}. ` +
      "Please open an issue with your OS/CPU details.",
  );
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(__dirname, "dist", binaryName);

if (!fs.existsSync(binPath)) {
  console.error(
    `[effect-solutions] Prebuilt binary not found for ${PLATFORM_ARCH}. ` +
      "Try reinstalling, or open an issue if the problem persists.",
  );
  process.exit(1);
}

const result = spawnSync(binPath, process.argv.slice(2), {
  stdio: "inherit",
});

if (result.error) {
  console.error(`[effect-solutions] Failed to start binary: ${result.error}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
