import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const referencesDirectory = path.join(process.cwd(), "references");

export interface ReferenceMetadata {
  title: string;
  description?: string;
  order?: number;
}

export interface Reference extends ReferenceMetadata {
  slug: string;
  content: string;
}

export function getAllReferenceSlugs(): string[] {
  if (!fs.existsSync(referencesDirectory)) {
    return [];
  }

  const fileNames = fs.readdirSync(referencesDirectory);
  return fileNames
    .filter((name) => name.endsWith(".md") || name.endsWith(".mdx"))
    .map((name) => name.replace(/\.(md|mdx)$/, ""));
}

function stripFirstH1(content: string): string {
  // Remove the first H1 (# heading) from the content
  return content.replace(/^#\s+.+$/m, "").trim();
}

function processInternalLinks(content: string): string {
  // Convert markdown links that reference other docs to proper paths
  // Matches [text](filename) or [text](filename.md) and converts to [text](/references/filename)
  return content.replace(
    /\[([^\]]+)\]\((?!https?:\/\/|\/|#)([^)]+?)(\.mdx?)?(\))/g,
    (_match, text, filename) => {
      // Remove any .md or .mdx extension and add /references/ prefix
      const cleanFilename = filename.replace(/\.(mdx?|md)$/, "");
      return `[${text}](/references/${cleanFilename})`;
    },
  );
}

export function getReferenceBySlug(slug: string): Reference | null {
  try {
    let fullPath = path.join(referencesDirectory, `${slug}.md`);
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(referencesDirectory, `${slug}.mdx`);
    }

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    // Process the content: strip first H1 and fix internal links
    const processedContent = processInternalLinks(stripFirstH1(content));

    return {
      slug,
      title: data.title || slug,
      description: data.description,
      order: data.order,
      content: processedContent,
    };
  } catch (_error) {
    return null;
  }
}

export function getAllReferences(): Reference[] {
  const slugs = getAllReferenceSlugs();

  const references = slugs
    .map((slug) => getReferenceBySlug(slug))
    .filter((ref): ref is Reference => ref !== null);

  return references.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return a.title.localeCompare(b.title);
  });
}
