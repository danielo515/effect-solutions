# Effect Best Practices Repository

This is a Bun workspace monorepo containing Effect TypeScript best practices documentation and tooling.

## Project Structure

- `packages/website/` - Next.js documentation site
- `packages/cli/` - Effect-based CLI installer for Claude Code skill
- `references/` - Markdown documentation files (copied to website package)

## Development Commands

```bash
# Install dependencies
bun install

# Run website dev server
bun run dev

# Build packages
bun --cwd packages/website build
bun --cwd packages/cli build

# Format code
bun run format
```

## Important Notes

- Always use Bun (not npm/pnpm/yarn)
- This is a Bun workspace - dependencies are shared at root level
- Effect Language Service is configured - TypeScript is patched for Effect LSP support
- Website uses Next.js 16 App Router with MDX for documentation
- CLI uses Effect services (FileSystem, Path, HttpClient via FetchHttpClient)

## Workspace Configuration

The root `package.json` defines:
- `workspaces: ["packages/*"]`
- Scripts delegate to packages using `--cwd`

Both packages extend `tsconfig.base.json` which includes Effect Language Service plugin.
