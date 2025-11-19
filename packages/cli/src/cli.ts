#!/usr/bin/env bun

import { BunContext, BunRuntime } from "@effect/platform-bun";
import {
  FileSystem,
  Path,
  HttpClient,
  HttpClientRequest,
  FetchHttpClient,
} from "@effect/platform";
import { Console, Effect, Layer } from "effect";
import { Command, Options } from "@effect/cli";
import { REFERENCE_FILES } from "./reference-manifest";

// GitHub repository URLs
const GITHUB_REPO = "kitlangton/effect-best-practices";
const GITHUB_BRANCH = "main";
const REPO_RAW_URL = `https://github.com/${GITHUB_REPO}/raw/${GITHUB_BRANCH}`;
const REFERENCES_DIR = "packages/website/references";

const downloadFile = (url: string, dest: string) =>
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    yield* Console.log(`Downloading ${url}...`);

    const request = HttpClientRequest.get(url);
    const response = yield* http.execute(request).pipe(
      Effect.flatMap((res) => res.text),
      Effect.scoped,
    );

    yield* fs.makeDirectory(path.dirname(dest), { recursive: true });
    yield* fs.writeFileString(dest, response);
  });

const installSkill = (global: boolean) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;

    const skillName = "effect-best-practices";
    const homeDir = yield* Effect.promise(() => import("node:os")).pipe(
      Effect.map((os) => os.homedir()),
    );

    const targetDir = global
      ? path.join(homeDir, ".claude", "skills", skillName)
      : path.join(path.join(process.cwd()), ".claude", "skills", skillName);

    yield* Console.log(
      `Installing Effect Best Practices skill to ${targetDir}...`,
    );

    // Create directories
    yield* fs.makeDirectory(path.join(targetDir, "references"), {
      recursive: true,
    });

    // Download SKILL.md
    yield* downloadFile(
      `${REPO_RAW_URL}/SKILL.md`,
      path.join(targetDir, "SKILL.md"),
    );

    yield* Effect.forEach(
      REFERENCE_FILES,
      (ref) =>
        downloadFile(
          `${REPO_RAW_URL}/${REFERENCES_DIR}/${ref}`,
          path.join(targetDir, "references", ref),
        ),
      { concurrency: 3 },
    );

    yield* Console.log("✓ Effect Best Practices skill installed successfully!");
    yield* Console.log("\nRestart Claude Code to activate the skill.");
  });

const globalOption = Options.boolean("global").pipe(
  Options.withAlias("g"),
  Options.withDescription("Install globally to ~/.claude/skills/"),
);

const installCommand = Command.make("install", { global: globalOption }).pipe(
  Command.withHandler(({ global }) => installSkill(global)),
  Command.withDescription("Install the Effect Best Practices skill"),
);

const cli = Command.make("effect-best-practices").pipe(
  Command.withSubcommands([installCommand]),
  Command.withDescription("Effect Best Practices CLI"),
);

const MainLive = Layer.mergeAll(BunContext.layer, FetchHttpClient.layer);

Command.run(cli, {
  name: "effect-best-practices",
  version: "0.1.0",
})(process.argv.slice(2)).pipe(Effect.provide(MainLive), BunRuntime.runMain);
