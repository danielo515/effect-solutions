# Effect Best Practices

Monorepo that powers the Effect Institute reference site (Next.js) and the
`effect-best-practices` CLI/Claude skill installer.

## Requirements

- [Bun](https://bun.sh) 1.1+
- Node 18+ (for the Next.js dev server)

## Workspace Layout

| Path | Description |
| --- | --- |
| `packages/website` | Next.js site that renders Effect reference docs |
| `packages/cli` | Bun-based CLI that installs the docs into Claude Code |
| `scripts/package-skill.sh` | Helper that zips the docs + metadata for manual installs |

The root `bun.lock` tracks dependencies for all workspaces.

## Installation

```bash
bun install
```

## Development

- **Website:** `bun run dev` (proxied to `packages/website`), then visit `http://localhost:3000`.
- **CLI:** `bun --cwd packages/cli dev` runs the installer locally.

Useful scripts from the project root:

```bash
bun run build   # next build
bun run lint    # biome check
bun run format  # biome format --write
```

## Packaging the Claude skill

The `scripts/package-skill.sh` helper scans
`packages/website/references/` so every markdown file is bundled
automatically:

```bash
bash scripts/package-skill.sh
open dist/effect-best-practices.zip
```

Extract the archive into `~/.claude/skills/` and restart Claude Code.

## Updating references

Add new docs under `packages/website/references/`. The packaging script and
CLI pull in every `*.md`/`*.mdx` file automatically, so no manual lists need to
be updated.
