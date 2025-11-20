import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, readFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Effect } from "effect";
import { maybeNotifyUpdate } from "./update-notifier";

const pkgName = "effect-solutions";

const readCache = async (home: string) => {
  const file = path.join(home, ".config", pkgName, "update.json");
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as { latest: string; nextCheck: number };
};

describe("maybeNotifyUpdate (effect)", () => {
  let originalHome: string;
  let originalNodeEnv: string | undefined;
  let tmpHome: string;
  let logs: Array<string>;
  const originalConsoleLog = console.log;

  const cachePath = (home: string) =>
    path.join(home, ".config", pkgName, "update.json");

  beforeEach(async () => {
    originalHome = process.env.HOME ?? os.homedir();
    originalNodeEnv = process.env.NODE_ENV;
    tmpHome = await mkdtemp(path.join(os.tmpdir(), "effect-solutions-test-"));
    process.env.HOME = tmpHome;
    process.env.NODE_ENV = "development";

    logs = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    delete process.env.CI;
    console.log = originalConsoleLog;
    await rm(tmpHome, { recursive: true, force: true }).catch(() => {});
  });

  test("emits hint when cache says newer version", async () => {
    const nextWeek = Date.now() + 1000 * 60 * 60 * 24 * 7;
    await mkdir(path.dirname(cachePath(tmpHome)), { recursive: true });
    await writeFile(
      cachePath(tmpHome),
      JSON.stringify({ latest: "9.9.9", nextCheck: nextWeek }),
      "utf8",
    );

    await Effect.runPromise(maybeNotifyUpdate(pkgName, "1.0.0"));

    expect(logs.join("\n")).toContain("1.0.0 → 9.9.9");
    expect(logs.join("\n")).toContain("bun add -g effect-solutions@latest");
  });

  test("does nothing when already latest in cache", async () => {
    const nextWeek = Date.now() + 1000 * 60 * 60 * 24 * 7;
    await mkdir(path.dirname(cachePath(tmpHome)), { recursive: true });
    await writeFile(
      cachePath(tmpHome),
      JSON.stringify({ latest: "1.0.0", nextCheck: nextWeek }),
      "utf8",
    );

    await Effect.runPromise(maybeNotifyUpdate(pkgName, "1.0.0"));

    expect(logs).toHaveLength(0);
  });

  test("skips entirely in CI", async () => {
    process.env.CI = "true";
    const nextWeek = Date.now() + 1000 * 60 * 60 * 24 * 7;
    await mkdir(path.dirname(cachePath(tmpHome)), { recursive: true });
    await writeFile(
      cachePath(tmpHome),
      JSON.stringify({ latest: "9.9.9", nextCheck: nextWeek }),
      "utf8",
    );

    await Effect.runPromise(maybeNotifyUpdate(pkgName, "1.0.0"));

    expect(logs).toHaveLength(0);
  });

  // Note: we intentionally avoid mocking fetch because the Effect runtime expects a real Fetch implementation.
});
