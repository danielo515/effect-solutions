---
title: Overview
description: "Map of all Effect Solutions references with quick links"
order: 0
---

# Effect Solutions

Effect Solutions is a comprehensive guide for humans and AI agents to understand best practices and patterns when building applications with the Effect library. This resource covers everything from initial project setup through advanced patterns for dependency injection, error handling, and data modeling.

Whether you're starting a new Effect project or integrating Effect into an existing codebase, these guides provide battle-tested patterns and configurations that align with Effect's philosophy.

## MCP Access

### Claude Code MCP CLI

```bash
claude mcp add effect-solutions -- bunx effect-solutions-mcp@latest
```

This registers the server for the current workspace only; append `--scope user` if you want Claude Code to launch `effect-solutions` in every repo automatically.

### Codex CLI Setup

```bash
codex mcp add effect-solutions -- bunx effect-solutions-mcp@latest
```

Codex stores MCP entries globally in `~/.codex/config.toml`; edit that file (or re-run `codex mcp add --scope local …`) if you need per-project overrides. Use `/mcp run effect-solutions <resource>` to fetch docs on demand.

## CLI Access

```bash
# List topics
bunx effect-solutions@latest list

# Show specific topics
bunx effect-solutions@latest show project-setup tsconfig
```

## Core Topics

### [Project Setup](/01-project-setup)
Configure the Effect Language Service for enhanced TypeScript diagnostics and IntelliSense. Covers installation via LSP CLI patch, VSCode settings, and verification steps to ensure your editor provides real-time Effect-specific type checking.

### [TypeScript Config](/02-tsconfig)
Recommended TypeScript compiler options optimized for Effect development. Includes strict mode flags, module resolution settings, and Effect-specific configuration that ensures type safety and proper inference across your codebase.

### [Services & Layers](/03-services-and-layers)
Dependency injection patterns using Effect's Context and Layer system. Learn how to define services with `Context.Tag`, implement them with `Layer.succeed` or `Layer.effect`, compose layers, and manage dependencies in a type-safe, testable way.

### [Effect Style](/04-effect-style)
Writing idiomatic Effect code including pipe-based composition, generator syntax with `Effect.gen`, choosing between `Effect.all` and generators, and when to use `Do` notation. Covers common patterns that make Effect code readable and maintainable.

### [Data Types](/05-data-types)
Branded types for semantic type safety, Schema-based validation and serialization, and generating type-safe unique identifiers. Includes patterns for domain modeling that leverage Effect's ecosystem to prevent invalid states at compile time.

### [Error Handling](/06-error-handling)
Structured error handling with `Data.TaggedError`, understanding `Cause` for failure inspection, and pattern matching on errors using `Effect.match`. Covers how to model expected failures in the type system and handle unexpected errors gracefully.

### [Configuration](/07-config)
Application configuration using Effect's `Config` module. Learn how to define typed configuration with defaults, validation, and environment variable mapping that integrates seamlessly with your Effect services and layers.

<DraftNote>

### [Project Structure](/08-project-structure)
Folder organization patterns for Effect applications

### [Incremental Adoption](/09-incremental-adoption)
Gradually introducing Effect to existing codebases

</DraftNote>
