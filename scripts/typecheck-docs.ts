#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DOCS_DIR = join(import.meta.dir, "../packages/website/docs");
const TEMP_DIR = join(import.meta.dir, "../.docs-typecheck");

async function extractCodeBlocks() {
  const files = await readdir(DOCS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const allCode: string[] = [];

  for (const file of mdFiles) {
    const content = await readFile(join(DOCS_DIR, file), "utf-8");
    const lines = content.split("\n");

    let inCodeBlock = false;
    let isTypeScriptBlock = false;
    let currentBlock: string[] = [];
    let blockNum = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("```typescript") || line.startsWith("```ts")) {
        inCodeBlock = true;
        isTypeScriptBlock = true;
        currentBlock = [];
      } else if (line.startsWith("```") && inCodeBlock) {
        if (isTypeScriptBlock && currentBlock.length > 0) {
          allCode.push(
            `// ${file}:${i - currentBlock.length} (block ${++blockNum})\n${currentBlock.join("\n")}`,
          );
        }
        inCodeBlock = false;
        isTypeScriptBlock = false;
        currentBlock = [];
      } else if (inCodeBlock) {
        currentBlock.push(line);
      }
    }
  }

  return allCode;
}

async function main() {
  console.log("Extracting TypeScript code blocks...");
  const blocks = await extractCodeBlocks();

  if (blocks.length === 0) {
    console.log("No TypeScript code blocks found");
    return;
  }

  console.log(`Found ${blocks.length} TypeScript code blocks\n`);

  // Clean and create temp dir
  await rm(TEMP_DIR, { recursive: true, force: true });
  await mkdir(TEMP_DIR, { recursive: true });

  // Write all blocks to a single file (simpler, accepts some duplicates)
  const combined = blocks.join("\n\n");
  await writeFile(join(TEMP_DIR, "docs.ts"), combined);

  // Create a minimal tsconfig for the temp dir
  const tsconfig = {
    extends: "../tsconfig.base.json",
    compilerOptions: {
      lib: ["ES2022", "DOM"],
      noEmit: true,
      skipLibCheck: true,
    },
    include: ["*.ts"],
  };
  await writeFile(
    join(TEMP_DIR, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2),
  );

  // Run tsc
  console.log("Running TypeScript compiler...");
  const result = spawnSync("bunx", ["tsc", "-p", TEMP_DIR], {
    stdio: "inherit",
  });

  // Cleanup
  await rm(TEMP_DIR, { recursive: true, force: true });

  if (result.status !== 0) {
    process.exit(1);
  }

  console.log("\n✓ All code blocks typecheck successfully!");
}

main();
