---
title: Repo Setup
order: 1
---

# Repo Setup

## Effect Language Service

Install the Effect Language Service for editor diagnostics and compiler-time type checking.

**Read the official setup guide:**
[Effect Language Service](https://github.com/Effect-TS/language-service)

Follow the instructions for your build tool (bun/npm/pnpm). This will give you:

- Editor diagnostics and refactors
- Compile-time Effect type checking via TypeScript patching

Make sure to add the `prepare` script to `package.json` as recommended in the README to persist the TypeScript patch across installs.

## TypeScript Configuration

Effect projects benefit from strict TypeScript configuration for safety and performance.

**See:** [TypeScript Configuration Guide](./tsconfig.md)

Reference configuration from Effect v4:
[effect-smol tsconfig.base.jsonc](https://github.com/Effect-TS/effect-smol/blob/main/tsconfig.base.jsonc)
