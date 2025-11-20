---
title: TypeScript Config
description: "Recommended TypeScript compiler settings tuned for Effect"
order: 2
---

# TypeScript Configuration

Effect projects benefit from strict TypeScript configuration. Reference configuration from Effect v4 (effect-smol):

**Example config:**
[effect-smol tsconfig.base.jsonc](https://github.com/Effect-TS/effect-smol/blob/main/tsconfig.base.jsonc)

## Key Settings Explained

### Build Performance

```jsonc
"incremental": true,
"composite": true,
```

- **incremental** - Fast rebuilds via .tsbuildinfo cache
- **composite** - Enables project references for monorepos

### Module System

```jsonc
"target": "ES2022",
"module": "NodeNext",
"moduleDetection": "force",
```

- **ES2022** - Modern JS features (top-level await, etc)
- **NodeNext** - Proper ESM/CJS resolution
- **force** - Treats all files as modules

### Import Handling

```jsonc
"verbatimModuleSyntax": true,
"rewriteRelativeImportExtensions": true,
```

- **verbatimModuleSyntax** - Preserves `import type` syntax exactly
- **rewriteRelativeImportExtensions** - Allows `.ts` in imports

### Type Safety

```jsonc
"strict": true,
"exactOptionalPropertyTypes": true,
"noUnusedLocals": true,
"noImplicitOverride": true,
```

- **strict** - All strict checks enabled
- **exactOptionalPropertyTypes** - `{ x?: number }` can't be `{ x: undefined }`
- **noUnusedLocals** - Catch unused variables
- **noImplicitOverride** - Explicit `override` keyword required

### Development

```jsonc
"declarationMap": true,
"sourceMap": true,
"skipLibCheck": true,
```

- **declarationMap** - Jump-to-definition works for .d.ts
- **sourceMap** - Debugging support
- **skipLibCheck** - Faster builds (skip node_modules type checking)

### Effect Integration

```jsonc
"plugins": [
  {
    "name": "@effect/language-service"
  }
]
```

Enables Effect language service for editor diagnostics. For build-time diagnostics, run `bunx effect-language-service patch` (see [Project Setup](./01-project-setup.md)).

## Why These Settings?

1. **Performance** - Incremental builds, composite projects
2. **Safety** - Maximum type checking without escape hatches
3. **Modern** - ESM-first, works with Node.js native modules
4. **DX** - Source maps, declaration maps, Effect diagnostics

## Module Settings by Project Type

The key difference between project types is the `module` setting:

### Bundled Apps (Vite, Webpack, esbuild)

```jsonc
{
  "compilerOptions": {
    "module": "preserve",
    "noEmit": true
  }
}
```

Use `"module": "preserve"` when a bundler handles module transformation. TypeScript acts as a type-checker only.

### Libraries & Node Apps (Transpiled with tsc)

```jsonc
{
  "compilerOptions": {
    "module": "NodeNext"
  }
}
```

Use `"module": "NodeNext"` when TypeScript transpiles your code. Required for:
- npm packages (libraries)
- Node.js apps without a bundler

**Additional library settings:**
```jsonc
{
  "compilerOptions": {
    "declaration": true,
    "composite": true,      // monorepos only
    "declarationMap": true  // monorepos only
  }
}
```

**Rule of thumb:** Bundler compiling? Use `preserve`. TypeScript compiling? Use `NodeNext`.
