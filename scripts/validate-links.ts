#!/usr/bin/env bun
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
function getSlugFromFilename(filename: string): string {
  return filename.replace(/^\d+-/, "").replace(/\.md$/, "");
}

// Check if a slug exists in the docs directory
async function slugExists(slug: string, docFiles: string[]): Promise<boolean> {
  return docFiles.some((file) => getSlugFromFilename(file) === slug);
}

// Check if an anchor exists in a file
async function anchorExists(
  filepath: string,
  anchor: string,
): Promise<boolean> {
  const content = await readFile(filepath, "utf-8");
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
}

// Extract all markdown links from content
function extractLinks(content: string, filename: string): Link[] {
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
}

// Validate a link
async function validateLink(
  link: Link,
  docFiles: string[],
): Promise<LinkError | null> {
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
  const exists = await slugExists(path, docFiles);
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
      const anchorFound = await anchorExists(targetPath, anchor);
      if (!anchorFound) {
        return {
          link,
          error: `Anchor not found in ${path}: #${anchor}`,
        };
      }
    }
  }

  return null;
}

async function main() {
  console.log("Validating internal documentation links...\n");

  // Get all markdown files
  const files = await readdir(DOCS_DIR);
  const docFiles = files.filter((f) => f.endsWith(".md"));

  if (docFiles.length === 0) {
    console.log("No markdown files found");
    return;
  }

  // Collect all links from all files
  const allLinks: Link[] = [];
  for (const file of docFiles) {
    const content = await readFile(join(DOCS_DIR, file), "utf-8");
    // Skip draft docs
    const fm = content.match(/^---\n([\s\S]*?)\n---/);
    if (fm && /draft:\s*true/.test(fm[1])) continue;

    const links = extractLinks(content, file);
    allLinks.push(...links);
  }

  // Filter to only internal links (start with /)
  const internalLinks = allLinks.filter(
    (link) =>
      link.href.startsWith("/") &&
      !link.href.startsWith("http://") &&
      !link.href.startsWith("https://"),
  );

  console.log(`Found ${internalLinks.length} internal links to validate\n`);

  // Validate all links
  const errors: LinkError[] = [];
  for (const link of internalLinks) {
    const error = await validateLink(link, docFiles);
    if (error) {
      errors.push(error);
    }
  }

  // Report results
  if (errors.length === 0) {
    console.log("✓ All internal links are valid!");
    return;
  }

  console.error(`✗ Found ${errors.length} broken link(s):\n`);
  for (const { link, error } of errors) {
    console.error(`  ${link.file}:${link.line}`);
    console.error(`    [${link.text}](${link.href})`);
    console.error(`    ${error}\n`);
  }

  process.exit(1);
}

main();
