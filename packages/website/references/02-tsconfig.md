---
title: TypeScript Config
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
    "name": "@effect/language-service",
    "transform": "@effect/language-service/transform"
  }
]
```

Enables Effect language service for diagnostics and transforms.

## Why These Settings?

1. **Performance** - Incremental builds, composite projects
2. **Safety** - Maximum type checking without escape hatches
3. **Modern** - ESM-first, works with Node.js native modules
4. **DX** - Source maps, declaration maps, Effect diagnostics
