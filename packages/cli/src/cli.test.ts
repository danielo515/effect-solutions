import { describe, expect, test } from "bun:test";
import { BunContext } from "@effect/platform-bun";
import * as FileSystem from "@effect/platform/FileSystem";
import * as Path from "@effect/platform/Path";
import { Effect } from "effect";
import { runCli } from "./cli";
import {
  REFERENCE_CONTENT,
  REFERENCE_FILES,
  SKILL_DOCUMENT,
} from "./reference-manifest";

describe("effect-solutions CLI", () => {
  test("installs the skill locally using Effect temp directory", async () => {
    const effect = Effect.scoped(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const originalCwd = process.cwd();

        const tempRoot = yield* fs.makeTempDirectory({ prefix: "cli-test" });
        yield* Effect.addFinalizer(() =>
          fs.remove(tempRoot, { recursive: true }).pipe(Effect.ignore),
        );

        const projectDir = path.join(tempRoot, "project");
        yield* fs.makeDirectory(projectDir, { recursive: true });

        yield* Effect.acquireRelease(
          Effect.sync(() => {
            process.chdir(projectDir);
            return originalCwd;
          }),
          (previousCwd) => Effect.sync(() => process.chdir(previousCwd)),
        );

        yield* runCli(["bun", "effect-solutions", "install"]);

        const skillDir = path.join(
          projectDir,
          ".claude",
          "skills",
          "effect-solutions",
        );

        const skillFile = yield* fs.readFileString(
          path.join(skillDir, "SKILL.md"),
        );
        expect(skillFile).toBe(SKILL_DOCUMENT);

        for (const file of REFERENCE_FILES) {
          const content = yield* fs.readFileString(
            path.join(skillDir, "references", file),
          );
          expect(content).toBe(REFERENCE_CONTENT[file]);
        }
      }),
    ).pipe(Effect.provide(BunContext.layer));

    await Effect.runPromise(effect);
  });
});
