/// <reference types="node" />

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Browser } from "playwright";
import { chromium } from "playwright";

import { getAllDocs } from "../src/lib/mdx";

const VIEWPORT = { width: 1200, height: 630 };
const DEFAULT_DEVICE_SCALE = Number(process.env.OG_DEVICE_SCALE ?? 2);
const OUTPUT_DIR = path.join(process.cwd(), "public", "og");
const NEXT_CACHE_DIR = path.join(process.cwd(), ".next-og");
const TEMPLATE_ROUTE = "/og/template";

interface TemplateFields {
  slug: string;
  title: string;
  subtitle?: string;
  background?: string;
}

function buildDocSpecs(): TemplateFields[] {
  const docs = getAllDocs();
  const docSpecs = docs.map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    subtitle:
      doc.description ?? "Best practices for applying Effect in production.",
  }));

  // Add home page spec
  const homeSpec: TemplateFields = {
    slug: "home",
    title: "Effect Solutions",
    subtitle: "Best practices for building Effect TypeScript applications",
  };

  return [homeSpec, ...docSpecs];
}

function dedupeSpecs(specs: TemplateFields[]): TemplateFields[] {
  const seen = new Set<string>();
  const unique: TemplateFields[] = [];

  for (const spec of specs) {
    if (seen.has(spec.slug)) {
      console.warn(`Skipping duplicate OG slug: ${spec.slug}`);
      continue;
    }
    seen.add(spec.slug);
    unique.push(spec);
  }

  return unique;
}

function pickSpecs(): TemplateFields[] {
  const only = (process.env.OG_ONLY ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  const specs = dedupeSpecs(buildDocSpecs());
  if (only.length === 0) {
    return specs;
  }

  const filtered = specs.filter((spec) => only.includes(spec.slug));
  if (filtered.length === 0) {
    console.warn(
      `No OG specs matched OG_ONLY filter (${only.join(", ")}). Falling back to complete set.`,
    );
    return specs;
  }

  return filtered;
}

async function captureSpec(
  browser: Browser,
  spec: TemplateFields,
  baseUrl: string,
): Promise<void> {
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: DEFAULT_DEVICE_SCALE,
  });

  const templateURL = new URL(TEMPLATE_ROUTE, baseUrl);
  const params = templateURL.searchParams;
  params.delete("slug");

  (Object.entries(spec) as [keyof TemplateFields, string | undefined][]) // enforce tuple type
    .forEach(([key, value]) => {
      if (key === "slug" || !value) {
        return;
      }
      params.set(key, value);
    });

  await page.goto(templateURL.toString(), {
    waitUntil: "load",
  });

  const filePath = path.join(OUTPUT_DIR, `${spec.slug}.png`);
  await page.screenshot({ path: filePath, type: "png" });
  await page.close();
  console.log(`OG image generated: ${path.relative(process.cwd(), filePath)}`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const specs = pickSpecs();
  if (specs.length === 0) {
    console.warn("No OG specs detected. Nothing to do.");
    return;
  }

  const templateServer = await ensureTemplateServer();
  console.log(
    `Using OG template at ${new URL(TEMPLATE_ROUTE, templateServer.baseUrl).toString()}`,
  );

  console.log(`Generating ${specs.length} OG image(s)...`);

  const browser = await chromium.launch();
  try {
    for (const spec of specs) {
      await captureSpec(browser, spec, templateServer.baseUrl);
    }
  } finally {
    await browser.close();
    await templateServer.close?.();
  }

  console.log("OG generation complete.");
}

type TemplateServerHandle = {
  baseUrl: string;
  close?: () => Promise<void>;
};

async function ensureTemplateServer(): Promise<TemplateServerHandle> {
  const explicit = process.env.OG_BASE_URL;
  if (explicit) {
    return { baseUrl: explicit.trim().replace(/\/$/, "") };
  }

  const reusableBase = await findExistingDevServer();
  if (reusableBase) {
    console.log(`Reusing existing dev server at ${reusableBase}`);
    return { baseUrl: reusableBase };
  }

  const port = Number(process.env.OG_SERVER_PORT ?? 4311);
  console.log(
    `Starting temporary Next.js server for OG template on http://127.0.0.1:${port}...`,
  );

  fs.rmSync(NEXT_CACHE_DIR, { recursive: true, force: true });
  const distDir = path.join(process.cwd(), `.next-og-dist-${Date.now()}`);

  const child = spawn(
    "bunx",
    ["next", "dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BROWSER: "none",
        NEXT_CACHE_DIR,
        NEXT_DIST_DIR: distDir,
      },
      stdio: "pipe",
    },
  );

  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[og-dev] ${chunk}`);
  });
  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[og-dev] ${chunk}`);
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const readyPromise = waitForServer(
    new URL(TEMPLATE_ROUTE, baseUrl).toString(),
  );
  const exitPromise = new Promise<never>((_, reject) => {
    child.once("exit", (code) => {
      reject(
        new Error(`Next dev server exited early (code ${code ?? "null"})`),
      );
    });
  });

  await Promise.race([readyPromise, exitPromise]);
  await readyPromise;

  return {
    baseUrl,
    close: async () => {
      if (!child.killed) {
        child.kill("SIGTERM");
      }
      await new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
      });
      fs.rmSync(NEXT_CACHE_DIR, { recursive: true, force: true });
      fs.rmSync(distDir, { recursive: true, force: true });
    },
  } satisfies TemplateServerHandle;
}

async function waitForServer(url: string, timeoutMs = 45_000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore until timeout
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Next.js dev server at ${url}`);
}

async function findExistingDevServer(): Promise<string | null> {
  const candidates = [
    process.env.NEXT_DEFAULT_DEV_BASE_URL,
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (
      await isServerReachable(
        new URL(TEMPLATE_ROUTE, candidate).toString(),
        1_000,
      )
    ) {
      return candidate.replace(/\/$/, "");
    }
  }

  return null;
}

async function isServerReachable(url: string, timeoutMs = 2_000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
