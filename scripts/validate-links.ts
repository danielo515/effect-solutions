#!/usr/bin/env bun
import { Effect, Array, Console } from "effect";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE_DIR =
  // bun exposes import.meta.dir; node doesn't
  // @ts-expect-error bun
  import.meta.dir ?? fileURLToPath(new URL(".", import.meta.url));

const DOCS_DIR = join(BASE_DIR, "../packages/website/docs");

type Link = {
  file: string;
  line: number;
  text: string;
  href: string;
};

type LinkError = {
  link: Link;
  error: string;
};

// Extract the slug from a filename (e.g., "04-services-and-layers.md" -> "services-and-layers")
const getSlugFromFilename = (filename: string): string =>
  filename.replace(/^\d+-/, "").replace(/\.md$/, "");

// Check if a slug exists in the docs directory
const slugExists = (slug: string, docFiles: string[]): boolean =>
  docFiles.some((file) => getSlugFromFilename(file) === slug);

// Check if an anchor exists in a file
const anchorExists = (
  filepath: string,
  anchor: string,
): Effect.Effect<boolean, Error> =>
  Effect.gen(function* () {
    const content = yield* Effect.tryPromise({
      try: () => readFile(filepath, "utf-8"),
      catch: (error) => new Error(`Failed to read file: ${error}`),
    });

    const lines = content.split("\n");

    // Convert anchor to the format that markdown headers use
    // e.g., "Service-Driven Development" becomes "service-driven-development"
    const normalizedAnchor = anchor.toLowerCase();

    for (const line of lines) {
      // Check for markdown headers (# Header)
      const headerMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (headerMatch) {
        const headerText = headerMatch[1];
        // Normalize header text to slug format (lowercase, replace spaces/special chars with hyphens)
        const headerSlug = headerText
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

        if (headerSlug === normalizedAnchor) {
          return true;
        }
      }
    }

    return false;
  });

// Extract all markdown links from content
const extractLinks = (content: string, filename: string): Link[] => {
  const links: Link[] = [];
  const lines = content.split("\n");

  // Regex to match markdown links: [text](href)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(line)) !== null) {
      links.push({
        file: filename,
        line: i + 1,
        text: match[1],
        href: match[2],
      });
    }
  }

  return links;
};

// Validate a link
const validateLink = (
  link: Link,
  docFiles: string[],
): Effect.Effect<LinkError | null, Error> =>
  Effect.gen(function* () {
    const { href } = link;

    // Skip external links (http/https)
    if (href.startsWith("http://") || href.startsWith("https://")) {
      return null;
    }

    // Skip anchor-only links (same page)
    if (href.startsWith("#")) {
      return null;
    }

    // Skip mailto links
    if (href.startsWith("mailto:")) {
      return null;
    }

    // Internal links should start with /
    if (!href.startsWith("/")) {
      return {
        link,
        error: `Link should start with / for internal docs (got: ${href})`,
      };
    }

    // Parse the link
    const [path, anchor] = href.slice(1).split("#");

    // Check if the slug exists
    const exists = slugExists(path, docFiles);
    if (!exists) {
      return {
        link,
        error: `Target doc not found: ${path}`,
      };
    }

    // If there's an anchor, validate it exists in the target file
    if (anchor) {
      const targetFile = docFiles.find(
        (file) => getSlugFromFilename(file) === path,
      );
      if (targetFile) {
        const targetPath = join(DOCS_DIR, targetFile);
        const anchorFound = yield* anchorExists(targetPath, anchor);
        if (!anchorFound) {
          return {
            link,
            error: `Anchor not found in ${path}: #${anchor}`,
          };
        }
      }
    }

    return null;
  });

const main = Effect.gen(function* () {
  yield* Console.log("Validating internal documentation links...\n");

  // Get all markdown files
  const files = yield* Effect.tryPromise({
    try: () => readdir(DOCS_DIR),
    catch: (error) => new Error(`Failed to read docs directory: ${error}`),
  });

  const docFiles = files.filter((f) => f.endsWith(".md"));

  if (docFiles.length === 0) {
    yield* Console.log("No markdown files found");
    return;
  }

  // Collect all links from all files
  const allLinks = yield* Effect.all(
    docFiles.map((file) =>
      Effect.gen(function* () {
        const content = yield* Effect.tryPromise({
          try: () => readFile(join(DOCS_DIR, file), "utf-8"),
          catch: (error) => new Error(`Failed to read ${file}: ${error}`),
        });

        // Skip draft docs
        const fm = content.match(/^---\n([\s\S]*?)\n---/);
        if (fm && /draft:\s*true/.test(fm[1])) {
          return [];
        }

        return extractLinks(content, file);
      }),
    ),
    { concurrency: "unbounded" },
  ).pipe(Effect.map(Array.flatten));

  // Filter to only internal links (start with /)
  const internalLinks = allLinks.filter(
    (link) =>
      link.href.startsWith("/") &&
      !link.href.startsWith("http://") &&
      !link.href.startsWith("https://"),
  );

  yield* Console.log(
    `Found ${internalLinks.length} internal links to validate\n`,
  );

  // Validate all links
  const errors = yield* Effect.all(
    internalLinks.map((link) => validateLink(link, docFiles)),
    { concurrency: "unbounded" },
  ).pipe(Effect.map((results) => results.filter((e) => e !== null)));

  // Report results
  if (errors.length === 0) {
    yield* Console.log("✓ All internal links are valid!");
    return;
  }

  yield* Console.error(`✗ Found ${errors.length} broken link(s):\n`);
  for (const error of errors) {
    if (error) {
      yield* Console.error(`  ${error.link.file}:${error.link.line}`);
      yield* Console.error(`    [${error.link.text}](${error.link.href})`);
      yield* Console.error(`    ${error.error}\n`);
    }
  }

  yield* Effect.fail(new Error("Link validation failed"));
});

Effect.runPromise(main).catch(() => {
  process.exit(1);
});
