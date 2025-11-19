---
title: Effect Style
order: 4
---

# Effect Style

## Effect.fn for Effectful Functions

Use `Effect.fn` with generator functions for traced, named effects:

```typescript
import { Effect } from "effect"

interface User {
  id: string
  name: string
}

const getUser = (userId: string): Effect.Effect<User> =>
  Effect.succeed({ id: userId, name: "Test User" })

const processData = (user: User): Effect.Effect<User> =>
  Effect.succeed(user)

const processUser = Effect.fn("processUser")(function* (userId: string) {
  const user = yield* getUser(userId)
  const processed = yield* processData(user)
  return processed
})

// Usage
const program = Effect.gen(function* () {
  const result = yield* processUser("user-123")
  return result
})
```

**Benefits:**
- Named spans for tracing/debugging
- Stack traces with location details
- Clean signatures
- Better type inference

## Effect.fnUntraced for Performance-Critical Paths

Use `Effect.fnUntraced` for helper functions where performance matters:

```typescript
import { Effect, Schema } from "effect"
import { HttpClient, HttpClientResponse } from "@effect/platform"

const makeRequest = Effect.fnUntraced(function* <A, I, R>(
  url: string,
  schema: Schema.Schema<A, I, R>,
) {
  const httpClient = yield* HttpClient.HttpClient
  const response = yield* httpClient.get(url)
  return yield* HttpClientResponse.schemaBodyJson(schema)(response)
})
```

**When to use:**
- Internal helpers called frequently
- Performance-critical code paths
- Functions that don't need tracing overhead

**When NOT to use:**
- Public API methods (use `Effect.fn` with name)
- Functions where debugging/tracing is valuable

## Effect.gen for Sequential Operations

```typescript
import { Effect } from "effect"

const fetchData = (): Effect.Effect<string> => Effect.succeed("data")
const processData = (data: string): Effect.Effect<string> => Effect.succeed(data.toUpperCase())
const saveData = (data: string): Effect.Effect<void> => Effect.void

const program = Effect.gen(function* () {
  const data = yield* fetchData()
  const processed = yield* processData(data)
  return yield* saveData(processed)
})
```

**Prefer `Effect.gen` over `.pipe` with `flatMap`:**

```typescript
import { Effect } from "effect"

const getA = (): Effect.Effect<number> => Effect.succeed(1)
const getB = (a: number): Effect.Effect<string> => Effect.succeed(`Result: ${a}`)

// ✅ Good - readable, sequential
const goodProgram = Effect.gen(function* () {
  const a = yield* getA()
  const b = yield* getB(a)
  return b
})

// ❌ Avoid - nested, harder to read
const badProgram = getA().pipe(
  Effect.flatMap((a) => getB(a)),
)
```

## Imports

- Import classes/values **without** `type` (for constructors)
- Use `type` only for interfaces/type aliases

**Example:**
- ✅ Good: `import { Episode, EpisodeId } from "../types.js"`
- ✅ Good: `import type { FetchTimeWindows } from "./DataAggregator.js"`
- ❌ Bad: `import type { Episode } from "../types.js"` (can't use Episode.make())
