# Effect Solutions

Effect best practices and patterns for humans and AI agents — https://www.effect.solutions

> **Living Document**: This is an opinionated collection exploiting Cunningham's Law ("the best way to get the right answer on the internet is not to ask a question; it's to post the wrong answer"). Disagree with a recommendation? Think we should cover something? [Open an issue](https://github.com/kitlangton/effect-solutions/issues/new)

## Project Structure

- `packages/website/` - Documentation site (Next.js)
- `packages/cli/` - CLI for local docs access
- `packages/mcp/` - MCP server for Claude integration
- `.github/workflows/` - Automated validation & bots

## Quick Links

- **Website**: https://www.effect.solutions
- **CLI**: `bunx effect-solutions@latest list`

## Development

```bash
bun install          # Install dependencies
bun run dev          # Website dev server
bun run dev:cli      # CLI dev mode
bun run dev:mcp      # MCP server dev mode
bun run check        # Lint & typecheck
bun run format       # Format code
bun --cwd packages/website run generate:og  # Rebuild Open Graph images
```

### Open Graph Images

The Playwright generator lives at `packages/website/scripts/generate-og.ts` and renders the static template in `packages/website/src/app/og/template/page.tsx`. Run `bun --cwd packages/website run generate:og` to refresh every image (or `OG_ONLY=slug1,slug2 bun --cwd packages/website run generate:og` to target a subset). The resulting PNGs are written to `packages/website/public/og/` and referenced automatically in the Next.js metadata.

## Changesets & Publishing

```bash
bunx changeset       # Create changeset after discrete work
bun release          # Version, build, publish all packages
```

**Change types:**
- `patch` - Bug fixes, docs updates, minor tweaks
- `minor` - New features, backwards-compatible changes
- `major` - Breaking changes

## Workspace

Bun workspace with `workspaces: ["packages/*"]`. Effect Language Service configured via `tsconfig.base.json`.

## Design Notes

UI components use hard edges — no border radius (use `rounded-none` or omit rounding).

## Documentation Structure

Documentation lives in `packages/website/docs/`. Each file follows this pattern:

```
NN-slug.md          # NN = sort order (00-99)
```

Files are processed by Next.js and rendered with MDX support. The slug becomes the URL path.

### Adding New Docs

1. Create new file in `packages/website/docs/` with proper numbering
2. Add frontmatter with title and description
3. Run `bun --cwd packages/website run generate:og` to create social images
4. Test locally with `bun run dev`

### MDX Components

Custom components available in docs:

- Code blocks with syntax highlighting (via Shiki)
- Copy buttons on code blocks
- LLM instructions button for AI-friendly content
- Automatic table of contents generation

## CLI Package

The CLI (`packages/cli/`) provides offline access to documentation:

```bash
bunx effect-solutions list          # List all topics
bunx effect-solutions show <slug>   # Show specific topic
bunx effect-solutions search <term> # Search topics
```

Built with Effect CLI and Effect Schema. Tests in `packages/cli/src/cli.test.ts` validate all commands.

## MCP Server

The MCP server (`packages/mcp/`) exposes documentation to Claude via Model Context Protocol:

- `search_effect_solutions` - Search documentation by keyword
- `open_issue` - Open GitHub issues for feedback/suggestions

Configure in Claude Desktop via:

```json
{
  "mcpServers": {
    "effect-solutions": {
      "command": "bunx",
      "args": ["effect-solutions-mcp"]
    }
  }
}
```

## Testing

- CLI tests: `bun test packages/cli/src/cli.test.ts`
- MCP tests: `bun test packages/mcp/src/server.test.ts`
- Type checking: `bunx tsc --noEmit`
- Linting: `bunx biome check`

## Deployment

Website deploys automatically via Vercel on push to `main`.

CLI and MCP packages publish to npm via changesets workflow:

```bash
bunx changeset         # Create changeset
bun release            # Version, build, publish
```

## Architecture Notes

### Website

Next.js app router with:
- Static generation for all docs pages
- MDX processing via `next-mdx-remote`
- Tailwind CSS for styling
- Shiki for syntax highlighting
- Custom MDX components for enhanced code blocks

### CLI

Effect-based CLI using:
- `@effect/cli` for command parsing
- `@effect/schema` for validation
- `@effect/platform` for file I/O
- Embedded JSON docs bundle

### MCP Server

Effect-based MCP server using:
- `@modelcontextprotocol/sdk` for MCP protocol
- Effect for service architecture
- Same embedded docs as CLI
- GitHub API integration for issue creation

## Contributing

1. Fork and clone
2. Create feature branch
3. Make changes
4. Run `bun run check` and `bun test`
5. Create changeset: `bunx changeset`
6. Submit PR

For documentation changes:
- Edit files in `packages/website/docs/`
- Follow existing patterns and tone
- Keep examples concise and practical
- Test locally before submitting
