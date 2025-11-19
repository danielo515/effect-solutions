---
title: Project Setup
description: "Install the Effect Language Service and strict project defaults"
order: 1
---

# Project Setup

This guide covers:
1. Effect Language Service - Editor diagnostics & build-time type checking
2. TypeScript Configuration - Strict settings for Effect projects

For a well-configured Effect project, install the Effect Language Service and configure TypeScript for optimal development experience.

## Effect Language Service

The Effect Language Service provides editor diagnostics and compile-time type checking. This guide covers installation and setup.

### Installation

```bash
bun add -d @effect/language-service
```

Add the plugin to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "@effect/language-service"
      }
    ]
  }
}
```

### VS Code Setup

For VS Code or any VS Code fork (Cursor, etc.):

1. Add to `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "./node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

2. Press F1 → "TypeScript: Select TypeScript version"
3. Choose "Use workspace version"

### Enable Build-Time Diagnostics

Patch TypeScript to get Effect diagnostics during compilation:

```bash
bunx effect-language-service patch
```

Add to `package.json` to persist across installs:

```json
{
  "scripts": {
    "prepare": "effect-language-service patch"
  }
}
```

**Full guide:** [Effect Language Service](https://github.com/Effect-TS/language-service)

## MCP Setup for Agents

Point your copilots at the Effect Solutions MCP server so they pull the same docs as the CLI.

```bash
# Claude Code (workspace scope)
claude mcp add effect-solutions -- bunx effect-solutions-mcp@latest

# Claude Code (global scope)
claude mcp add effect-solutions -- bunx effect-solutions-mcp@latest --scope user
```

```bash
# Codex CLI (global config)
codex mcp add effect-solutions -- bunx effect-solutions-mcp@latest
```

Claude stores workspace entries per repo unless you pass `--scope user`; Codex writes to `~/.codex/config.toml` (re-run with `--scope local` for per-project overrides).

## LLM Context Directory

For repos where you work with AI agents (Claude, Cursor, etc.), use a `.context/` folder pattern:

- **Track the folder** in git, but **ignore its contents**
- Clone reference repos here (Effect core, related libraries, etc.) for LLM traversal
- The LLM can read upstream code/docs without polluting your git history

**Setup:**

In `.gitignore`:
```gitignore
# Local LLM context (tracked folder, ignored contents)
.context/*
!.context/.gitkeep
```

In `CLAUDE.md` or `AGENTS.md`:
```markdown
## LLM Context Workspace

- This repo uses `.context/` for local reference clones
- Typical entries:
  - `effect` – main Effect repo
  - `effect-solutions` – best practices repo
  - Any app/stack-specific references
- Tell agents: "Additional code/docs live under `.context/`"
```

Then clone reference repos:
```bash
cd .context
git clone https://github.com/Effect-TS/effect.git
```

This keeps your workspace clean while giving agents access to upstream sources.

## TypeScript Configuration

Effect projects benefit from strict TypeScript configuration for safety and performance.

**See:** [TypeScript Configuration Guide](./02-tsconfig.md)

Reference configuration from Effect v4:
[effect-smol tsconfig.base.jsonc](https://github.com/Effect-TS/effect-smol/blob/main/tsconfig.base.jsonc)
