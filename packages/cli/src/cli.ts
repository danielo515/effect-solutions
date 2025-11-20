#!/usr/bin/env bun

import { BunContext, BunRuntime } from "@effect/platform-bun";
import { Console, Effect, pipe } from "effect";
import { Args, Command } from "@effect/cli";
import { DOC_LOOKUP, DOCS } from "./docs-manifest";
import {
  BrowserOpenStrategy,
  OpenIssueCategory,
  openIssue,
} from "./open-issue-service";
import pc from "picocolors";
import pkg from "../package.json" with { type: "json" };
import { maybeNotifyUpdate } from "./update-notifier";

const CLI_NAME = "effect-solutions";
const CLI_VERSION = pkg.version;

const isDocSlug = (value: string): value is keyof typeof DOC_LOOKUP =>
  value in DOC_LOOKUP;

const colorizeCodeReferences = (text: string): string => {
  return (
    text
      // Commands in bold green
      .replace(/`bunx [^`]+`/g, (match) => pc.bold(pc.green(match)))
      .replace(/`bun run [^`]+`/g, (match) => pc.bold(pc.green(match)))
      // File references in cyan
      .replace(/`[^`]+\.(ts|json|toml|md)`/g, (match) => pc.cyan(match))
      // Other code in dim
      .replace(/`[^`]+`/g, (match) => pc.dim(match))
  );
};

const formatRow =
  (slugWidth: number, titleWidth: number) =>
  (slug: string, title: string, description: string) =>
    `${slug.padEnd(slugWidth)}  ${title.padEnd(titleWidth)}  ${description}`;

export const renderDocList = () => {
  const slugWidth = Math.max(
    "Slug".length,
    ...DOCS.map((doc) => doc.slug.length),
  );
  const titleWidth = Math.max(
    "Title".length,
    ...DOCS.map((doc) => doc.title.length),
  );

  const format = formatRow(slugWidth, titleWidth);
  const header = pc.bold(pc.cyan(format("Slug", "Title", "Description")));
  const separator = pc.dim(
    `${"-".repeat(slugWidth)}  ${"-".repeat(titleWidth)}  ${"-".repeat(20)}`,
  );

  const rows = DOCS.map((doc) =>
    format(pc.green(doc.slug), pc.yellow(doc.title), pc.dim(doc.description)),
  );

  const lines = [header, separator, ...rows];

  return `${lines.join("\n")}\n`;
};

export const renderDocs = (requested: ReadonlyArray<string>) => {
  const slugs = requested.map((slug) => slug.trim()).filter(Boolean);

  if (slugs.length === 0) {
    throw new Error("Please provide at least one doc slug.");
  }

  const unknown = slugs.filter((slug) => !isDocSlug(slug));
  if (unknown.length > 0) {
    throw new Error(`Unknown doc slug(s): ${unknown.join(", ")}`);
  }

  const uniqueSlugs = Array.from(new Set(slugs)) as Array<
    keyof typeof DOC_LOOKUP
  >;
  const blocks = uniqueSlugs.map((slug) => {
    const doc = DOC_LOOKUP[slug];
    if (!doc) {
      throw new Error(`Internal error: doc ${slug} not found in lookup`);
    }
    const title =
      pc.bold(pc.cyan(`## ${doc.title}`)) + " " + pc.dim(`(${doc.slug})`);
    const body = colorizeCodeReferences(doc.body.trim());
    return [title, "", body].filter(Boolean).join("\n");
  });

  return `${blocks.join("\n\n" + pc.dim("---") + "\n\n")}\n`;
};

const listDocs = Console.log(renderDocList());

const showDocs = (slugs: ReadonlyArray<string>) =>
  Effect.try(() => renderDocs(slugs)).pipe(
    Effect.flatMap((output) => Console.log(output)),
  );

const listCommand = Command.make("list").pipe(
  Command.withDescription("List Effect Solutions documentation"),
  Command.withHandler(() => listDocs),
);

const showCommand = Command.make("show", {
  slugs: Args.text({ name: "slug" }).pipe(Args.atLeast(1)),
}).pipe(
  Command.withDescription("Show one or more Effect Solutions docs"),
  Command.withHandler(({ slugs }) => showDocs(slugs)),
);

const openIssueCommand = Command.make("open-issue", {
  category: Args.text({
    name: "category",
    description: "Topic Request | Fix | Improvement",
  }),
  title: Args.text({ name: "title" }),
  description: Args.text({ name: "description" }),
  strategy: Args.text({ name: "strategy", optional: true }),
}).pipe(
  Command.withDescription(
    "Open a pre-filled GitHub issue in the effect-solutions repo",
  ),
  Command.withHandler(({ category, title, description, strategy }) =>
    Effect.sync(() => {
      const result = openIssue({
        category: category as OpenIssueCategory,
        title,
        description,
        strategy: strategy as BrowserOpenStrategy | undefined,
      });
      const lines = [
        pc.bold("Effect Solutions issue"),
        `URL: ${pc.cyan(result.issueUrl)}`,
        `Opened: ${result.opened ? pc.green("yes") : pc.yellow("no")} (${result.openedWith})`,
        result.message,
      ];
      return Console.log(lines.join("\n"));
    }),
  ),
);

export const cli = Command.make(CLI_NAME).pipe(
  Command.withDescription(
    "Effect Solutions CLI - Browse and search Effect best practices documentation. " +
      "Built for both humans and AI agents to quickly access Effect patterns, setup guides, and configuration examples.",
  ),
  Command.withSubcommands([listCommand, showCommand, openIssueCommand]),
);

export const runCli = (argv: ReadonlyArray<string>) =>
  Command.run(cli, {
    name: CLI_NAME,
    version: CLI_VERSION,
  })(argv);

if (import.meta.main) {
  pipe(
    maybeNotifyUpdate(CLI_NAME, CLI_VERSION),
    Effect.zipRight(runCli(process.argv)),
    Effect.provide(BunContext.layer),
    BunRuntime.runMain,
  );
}
