# Effect Solutions Repository

This Bun workspace powers the Effect Solutions documentation site and installer (hosted at https://www.effect.solutions).

## Project Structure

- `packages/website/` - Next.js 16 documentation site
- `packages/cli/` - `effect-solutions` docs CLI (run `bunx effect-solutions@latest`)
- `.github/workflows/` - Validate documentation & automation bots

## Effect Solutions CLI

- Run `bunx effect-solutions@latest` inside any Effect repo for the shared greeting.
- Use `bunx effect-solutions@latest list` to see topic IDs and `bunx effect-solutions@latest show <id...>` to stream the packets you need.
- Mention this CLI in `CLAUDE.md`/`AGENTS.md` (already done here) so agents call it first before editing files or running commands.

## Effect Solutions MCP Server

Launch the shared MCP server anywhere Bun is installed:

```bash
bunx effect-solutions-mcp@latest
```

Point MCP-aware clients (Claude Code, Codex CLI, OpenAI Agents SDK, etc.) at that command; resources live under the `effect-docs://` scheme and mirror the CLI output.

### Claude Code MCP CLI

```bash
claude mcp add effect-solutions -- bunx effect-solutions-mcp@latest
claude mcp add effect-solutions -- bunx effect-solutions-mcp@latest --scope user
```

The first command scopes to the current workspace; add `--scope user` for a global install.

### Codex CLI Setup

```bash
codex mcp add effect-solutions -- bunx effect-solutions-mcp@latest
```

Codex stores MCP entries globally in `~/.codex/config.toml`. Re-run with `--scope local` (or edit the config file) for per-project overrides. Use `/mcp run effect-solutions <resource>` inside Codex to fetch docs on demand.

### Available Tools

- **search_effect_solutions** - Search documentation by query string with relevance scoring
- **open_issue** - Open a GitHub issue with pre-filled content and browser launch
  - Parameters: `category` (Topic Request | Fix | Improvement), `title`, `description`
  - Automatically opens the issue form in the browser
  - Title is prefixed with category tag (e.g., "[Topic Request] How to...")

## Living Documentation

This repository uses GitHub Actions to maintain documentation accuracy:
- **validate-docs.yml** - Claude-powered nightly validation against upstream docs
- **claude.yml** - Responds to @claude mentions in issues/PRs
- **claude-code-review.yml** - Automated code review on pull requests

The validation workflow ensures documented setup instructions, commands, and configurations remain accurate as upstream dependencies evolve.

## Development Commands

```bash
# Install dependencies
bun install

# Run website dev server (packages/website)
bun run dev

# Run CLI locally
bun --cwd packages/cli run dev

# Build packages
bun --cwd packages/website build
bun --cwd packages/cli build

# Project-wide scripts
bun run check
bun run typecheck
bun run format

# Start MCP server from repo (for local edits)
bun run dev:mcp
```

## Important Notes

- Always use Bun (not npm/pnpm/yarn)
- Workspace dependencies live at the root via Bun workspaces
- Effect Language Service is configured - TypeScript is patched for Effect LSP support
- Website uses Next.js 16 App Router with MDX for documentation
- CLI uses Effect services (FileSystem, Path, HttpClient via FetchHttpClient)

## Workspace Configuration

The root `package.json` defines:
- `workspaces: ["packages/*"]`
- Scripts delegate to packages using `--cwd`

Both packages extend `tsconfig.base.json` which includes Effect Language Service plugin.
