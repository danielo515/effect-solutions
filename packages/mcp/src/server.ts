#!/usr/bin/env bun

import { McpSchema, McpServer, Tool, Toolkit } from "@effect/ai";
import { BunRuntime, BunSink, BunStream } from "@effect/platform-bun";
import { Effect, Layer, Schema } from "effect";
import { DOC_LOOKUP, DOCS } from "../../cli/src/docs-manifest";
import { openIssue as openIssueService } from "../../cli/src/open-issue-service";
import pkg from "../package.json" with { type: "json" };

const SERVER_NAME = "effect-solutions";
const SERVER_VERSION = pkg.version;
const docCompletionValues = DOCS.map((doc) => doc.slug);

const listMarkdown = [
  "# Effect Solutions Documentation Index",
  "",
  ...DOCS.map((doc) => `- **${doc.slug}** — ${doc.title}: ${doc.description}`),
].join("\n");

const topicsResourceContent = {
  contents: [
    {
      uri: "effect-docs://docs/topics",
      mimeType: "text/markdown",
      text: listMarkdown,
    },
  ],
} as const;

const lookupDocMarkdown = (slug: string) =>
  // Special-case the index so it always resolves (even if the template route matches).
  slug === "topics"
    ? Effect.succeed(topicsResourceContent)
    : Effect.try(() => {
        const doc = DOC_LOOKUP[slug];
        if (!doc) {
          throw new Error(`Unknown doc slug: ${slug}`);
        }
        return `# ${doc.title} (${doc.slug})\n\n${doc.body}`.trimEnd();
      });

const docSlugParam = McpSchema.param("slug", Schema.String);

const DocsIndexResource = McpServer.resource({
  uri: "effect-docs://docs/topics",
  name: "Effect Solutions Topics",
  description: "Markdown index of all Effect Solutions documentation slugs.",
  mimeType: "text/markdown",
  content: Effect.succeed(topicsResourceContent),
});

const DocsTemplate = McpServer.resource`effect-docs://docs/${docSlugParam}`({
  name: "Effect Solutions Doc",
  description:
    "Fetch any Effect Solutions doc by slug (see completions for available slugs).",
  mimeType: "text/markdown",
  completion: {
    slug: () => Effect.succeed(docCompletionValues),
  },
  content: (_uri, slug: string) => lookupDocMarkdown(slug),
});

// Search tool implementation
const SearchTool = Tool.make("search_effect_solutions", {
  description:
    "Search Effect Solutions documentation by query string. Returns matching docs with relevance scoring.",
  parameters: {
    query: Schema.String.annotations({
      description: "Search query to find relevant Effect documentation topics",
    }),
  },
  success: Schema.Struct({
    results: Schema.Array(
      Schema.Struct({
        slug: Schema.String.annotations({
          description: "Unique identifier for the documentation topic",
        }),
        title: Schema.String.annotations({
          description: "Title of the documentation topic",
        }),
        description: Schema.String.annotations({
          description: "Brief description of what the topic covers",
        }),
        excerpt: Schema.String.annotations({
          description: "Text excerpt containing the search query",
        }),
        score: Schema.Number.annotations({
          description: "Relevance score (higher is more relevant)",
        }),
      }),
    ).annotations({
      description: "List of matching documentation topics, sorted by relevance",
    }),
  }),
});

// Open GitHub issue tool
const OpenIssueTool = Tool.make("open_issue", {
  description:
    "Open a GitHub issue to request new documentation, ask questions not covered by current guides, or suggest topics. Returns a pre-filled issue URL.",
  parameters: {
    category: Schema.Literal("Topic Request", "Fix", "Improvement").annotations(
      {
        description:
          "Type of issue: 'Topic Request' for new docs, 'Fix' for errors/bugs, 'Improvement' for enhancements",
      },
    ),
    title: Schema.String.annotations({
      description:
        "Brief title for the issue (e.g., 'How to handle errors in services')",
    }),
    description: Schema.String.annotations({
      description:
        "Detailed description of the topic, question, or documentation request",
    }),
  },
  success: Schema.Struct({
    issueUrl: Schema.String.annotations({
      description: "GitHub issue URL with pre-filled content",
    }),
    message: Schema.String,
    opened: Schema.Boolean,
    openedWith: Schema.String,
  }),
});

// Help/Getting Started tool
const GetHelpTool = Tool.make("get_help", {
  description:
    "Get comprehensive help on using Effect Solutions MCP server, reading documentation, and setting up Effect repositories. Returns usage guide, best practices, and quick start instructions.",
  parameters: {},
  success: Schema.Struct({
    guide: Schema.String.annotations({
      description: "Complete usage guide in markdown format",
    }),
  }),
});

const searchDocs = ({ query }: { query: string }) =>
  Effect.sync(() => {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return { results: [] };
    }

    const terms = normalizedQuery.split(/\s+/);

    // Score each doc based on query match
    const results = DOCS.map((doc) => {
      const titleLower = doc.title.toLowerCase();
      const descLower = doc.description.toLowerCase();
      const bodyLower = doc.body.toLowerCase();
      const slugLower = doc.slug.toLowerCase();

      let score = 0;

      // Exact phrase match (highest priority)
      if (titleLower.includes(normalizedQuery)) score += 100;
      if (descLower.includes(normalizedQuery)) score += 50;
      if (slugLower.includes(normalizedQuery)) score += 75;
      if (bodyLower.includes(normalizedQuery)) score += 25;

      // Individual term matches
      for (const term of terms) {
        if (titleLower.includes(term)) score += 10;
        if (descLower.includes(term)) score += 5;
        if (slugLower.includes(term)) score += 7;
        if (bodyLower.includes(term)) score += 2;
      }

      // Find excerpt containing query
      const excerptLength = 200;
      let excerpt = doc.description;
      const queryIndex = bodyLower.indexOf(normalizedQuery);
      if (queryIndex !== -1) {
        const start = Math.max(0, queryIndex - 50);
        const end = Math.min(doc.body.length, queryIndex + excerptLength);
        excerpt =
          (start > 0 ? "..." : "") +
          doc.body.slice(start, end) +
          (end < doc.body.length ? "..." : "");
      }

      return {
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        excerpt: excerpt.trim(),
        score,
      };
    })
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    return { results };
  });

const openIssue = ({
  category,
  title,
  description,
}: {
  category: "Topic Request" | "Fix" | "Improvement";
  title: string;
  description: string;
}) =>
  Effect.sync(() =>
    openIssueService({
      category,
      title,
      description,
    }),
  );

const getHelp = () =>
  Effect.succeed({
    guide: `# Effect Solutions MCP Server Guide

## Overview

Effect Solutions MCP provides tools and resources for accessing curated Effect TypeScript documentation and best practices. Use this before editing code or running commands in Effect projects.

## Available Tools

### 1. get_help (current tool)
Get this help guide explaining MCP usage, doc reading workflow, and repo setup.

### 2. search_effect_solutions
Search all documentation by query string with relevance scoring.

**Usage:**
\`\`\`typescript
search_effect_solutions({ query: "error handling" })
search_effect_solutions({ query: "services" })
search_effect_solutions({ query: "dependency injection" })
\`\`\`

**Returns:** Array of matching docs with:
- slug (unique doc identifier)
- title
- description
- excerpt (text snippet containing query)
- score (relevance ranking)

### 3. open_issue
Request new docs, report errors, or suggest improvements.

**Usage:**
\`\`\`typescript
open_issue({
  category: "Topic Request", // or "Fix" or "Improvement"
  title: "How to handle retries",
  description: "I need guidance on retry strategies..."
})
\`\`\`

Returns pre-filled GitHub issue URL ready to open.

## Available Resources

### effect-docs://docs/topics
Complete index of all documentation topics with slugs, titles, and descriptions.

### effect-docs://docs/{slug}
Fetch specific documentation by slug (e.g., \`effect-docs://docs/error-handling\`).

Available slugs include:
${DOCS.slice(0, 10)
  .map((d) => `- ${d.slug}`)
  .join("\n")}
...and ${DOCS.length - 10} more (see effect-docs://docs/topics for full list)

## Recommended Workflow

### When Starting Any Effect Task:

1. **Search First** - Before editing code:
   \`\`\`typescript
   search_effect_solutions({ query: "<your topic>" })
   \`\`\`

2. **Read Relevant Docs** - Fetch specific topics:
   \`\`\`
   Read: effect-docs://docs/<slug>
   \`\`\`

3. **Apply Patterns** - Use documented patterns in your code

4. **Request Help** - If docs don't cover your need:
   \`\`\`typescript
   open_issue({
     category: "Topic Request",
     title: "Brief question",
     description: "What I'm trying to do..."
   })
   \`\`\`

### Example Workflow:

**Task:** "Add error handling to user service"

1. Search: \`search_effect_solutions({ query: "error handling services" })\`
2. Read returned slugs: \`effect-docs://docs/error-handling\`, \`effect-docs://docs/services\`
3. Apply patterns from docs
4. If blocked: \`open_issue({ category: "Topic Request", ... })\`

## Effect Repository Setup

### Prerequisites
- Bun installed
- Effect TypeScript project

### Recommended Setup Steps:

1. **Install Effect Language Service** (for IDE support):
   \`\`\`bash
   bun add -D effect-language-service
   bunx effect-language-service patch
   \`\`\`

2. **Add to CLAUDE.md or AGENTS.md**:
   \`\`\`markdown
   # Effect Solutions

   Before editing Effect code, run:
   \`\`\`bash
   bunx effect-solutions@latest list  # see all topics
   bunx effect-solutions@latest show <id...>  # read specific docs
   \`\`\`

   Or use the Effect Solutions MCP server for tool/resource access.
   \`\`\`

3. **Configure TypeScript** (if not using language service):
   Ensure \`strict: true\` and Effect-compatible settings in tsconfig.json

4. **Use Effect Solutions CLI** before major changes:
   \`\`\`bash
   bunx effect-solutions@latest show error-handling services
   \`\`\`

## Best Practices

### DO:
- ✅ Search documentation BEFORE writing code
- ✅ Read multiple related topics for context
- ✅ Follow documented patterns exactly
- ✅ Request new topics when gaps found
- ✅ Reference specific doc slugs in code comments

### DON'T:
- ❌ Skip documentation lookup
- ❌ Mix patterns from different docs without understanding
- ❌ Assume standard TypeScript patterns work in Effect
- ❌ Ignore Effect-specific error handling
- ❌ Forget to patch TypeScript with effect-language-service

## Common Topics to Search

- "error handling" - Effect.try, Either, Option patterns
- "services" - Layer, Context, dependency injection
- "concurrency" - Fiber, Queue, Deferred
- "testing" - Effect.gen test patterns, Layer testing
- "schema" - Schema validation, encoding, decoding
- "http" - HttpClient, HttpServer patterns
- "configuration" - Config, Layer composition

## Quick Reference

| Task | Command |
|------|---------|
| List all topics | \`effect-docs://docs/topics\` resource |
| Search docs | \`search_effect_solutions({ query: "..." })\` |
| Read topic | \`effect-docs://docs/{slug}\` resource |
| Request new docs | \`open_issue({ category: "Topic Request", ... })\` |
| Report error | \`open_issue({ category: "Fix", ... })\` |
| Suggest improvement | \`open_issue({ category: "Improvement", ... })\` |

## Support

- Website: https://www.effect.solutions
- Repository: https://github.com/kitlangton/effect-solutions
- Use \`open_issue\` tool to request help

---

**Remember:** Always search Effect Solutions documentation before editing Effect code. Following documented patterns prevents common mistakes and ensures idiomatic Effect usage.
`,
  });

const toolkit = Toolkit.make(SearchTool, OpenIssueTool, GetHelpTool);

const toolkitLayer = toolkit.toLayer({
  search_effect_solutions: searchDocs,
  open_issue: openIssue,
  get_help: getHelp,
});

const serverLayer = Layer.mergeAll(
  DocsIndexResource,
  DocsTemplate,
  Layer.effectDiscard(McpServer.registerToolkit(toolkit)),
).pipe(
  Layer.provideMerge(toolkitLayer),
  Layer.provide(
    McpServer.layerStdio({
      name: SERVER_NAME,
      version: SERVER_VERSION,
      stdin: BunStream.stdin,
      stdout: BunSink.stdout,
    }),
  ),
);

Layer.launch(serverLayer).pipe(BunRuntime.runMain);
