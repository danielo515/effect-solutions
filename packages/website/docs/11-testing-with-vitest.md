---
title: Testing with Vitest
description: "@effect/vitest helpers for Effect-powered specs"
order: 11
draft: true
---

# Testing with Vitest (Draft)

`@effect/vitest` lets you run Effect programs inside Vitest while keeping layers, scoped resources, and structured errors.

## Install

```bash
bun add -D vitest @effect/vitest
```

## Base test file

```typescript
// math.test.ts
import { describe, expect } from "vitest"
import { it } from "@effect/vitest"
import { Effect } from "effect"

describe("math", () => {
  it("adds numbers", () =>
    Effect.gen(function* () {
      const result = 1 + 2
      expect(result).toBe(3)
    })
  )
})
```

`it` returns a Vitest test function that evaluates the effect and reports fiber failures with full stack traces.

## Providing Layers in tests

```typescript
import { layer } from "@effect/vitest"
import { UserRepo, userRepoLayer } from "../src/UserRepo"

layer(userRepoLayer)

it.scoped("reads from repo", () =>
  Effect.gen(function* () {
    const repo = yield* UserRepo
    const user = yield* repo.get("user-1")
    expect(user.id).toBe("user-1")
  })
)
```

- `layer()` registers dependencies once per file; layers are memoized across tests.
- Use `it.scoped` when your effect acquires resources (files, connections) so they close automatically.

## Property testing and failures

```typescript
import { it } from "@effect/vitest"
import { Effect } from "effect"

it("commutative addition", () =>
  Effect.gen(function* () {
    const a = 1
    const b = 2
    expect(a + b).toBe(b + a)
  })
)
```

When a fiber fails, `@effect/vitest` prints the fiber dump so you can see causes, spans, and logs. Combine with `Effect.logDebug` and `Console` to keep assertions thin.
