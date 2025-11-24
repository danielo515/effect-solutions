---
title: Testing with Vitest
description: "How to test Effect code with @effect/vitest"
order: 11
draft: true
---

# Testing with Vitest

`@effect/vitest` provides enhanced testing support for Effect code. It handles Effect execution, scoped resources, layers, and provides detailed fiber failure reporting.

## Why @effect/vitest?

- **Native Effect support**: Run Effect programs directly in tests with `it.effect()`
- **Automatic cleanup**: `it.scoped()` manages resource lifecycles
- **Test services**: Use TestClock, TestRandom for deterministic tests
- **Better errors**: Full fiber dumps with causes, spans, and logs
- **Layer support**: Share dependencies across tests with `layer()`

## Install

```bash
bun add -D vitest @effect/vitest
```

## Setup

Update your test script to use vitest (not `bun test`):

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create a `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
```

## Basic Testing

Import test functions and assertions from `@effect/vitest`:

```typescript
import { Effect } from "effect"
import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"

describe("Calculator", () => {
  // Sync test - regular function
  it("creates instances", () => {
    const result = 1 + 1
    strictEqual(result, 2)
  })

  // Effect test - returns Effect
  it.effect("adds numbers", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(1 + 1)
      strictEqual(result, 2)
    })
  )
})
```

## Assertion Styles

`@effect/vitest` supports two assertion styles. The Effect codebase **strongly prefers** the assert style by ~10:1.

### Recommended: Assert Style

Use `strictEqual()`, `deepStrictEqual()`, etc. from `@effect/vitest/utils`:

```typescript
import { strictEqual, deepStrictEqual, assertTrue } from "@effect/vitest/utils"

it.effect("assert style", () =>
  Effect.gen(function* () {
    strictEqual(1 + 1, 2)
    deepStrictEqual({ a: 1 }, { a: 1 })
    assertTrue(true)
  })
)
```

**Available assertions:**
- `strictEqual(actual, expected)` - strict equality (===)
- `deepStrictEqual(actual, expected)` - deep object/array comparison
- `assertTrue(value)` / `assertFalse(value)` - boolean checks
- `assertSome(option, expected)` / `assertNone(option)` - Option checks
- `assertRight(either, expected)` / `assertLeft(either, expected)` - Either checks
- `assertInstanceOf(value, Class)` - instanceof checks

### Also Available: Expect Style

Use `expect()` from `@effect/vitest` for special matchers:

```typescript
import { expect } from "@effect/vitest"

it.effect("expect style", () =>
  Effect.gen(function* () {
    expect(result).toContain("substring")
    expect(() => fn()).toThrow()
    expect(obj).toMatchObject({ a: 1 })
  })
)
```

## Test Function Variants

### it.effect()

For tests that return Effect values (most common):

```typescript
it.effect("processes data", () =>
  Effect.gen(function* () {
    const result = yield* processData("input")
    strictEqual(result, "expected")
  })
)
```

### it.scoped()

For tests using scoped resources (auto-cleanup):

```typescript
it.scoped("manages file handle", () =>
  Effect.gen(function* () {
    const file = yield* openFile("data.txt")
    const content = yield* readFile(file)
    strictEqual(content, "expected")
    // File automatically closed when test completes
  })
)
```

### it.live()

For tests using live TestClock or TestRandom:

```typescript
import { TestClock } from "effect"

it.live("advances time", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.delay(
      Effect.succeed("done"),
      Duration.seconds(10)
    ).pipe(Effect.fork)
    
    yield* TestClock.adjust(Duration.seconds(10))
    const result = yield* Fiber.join(fiber)
    strictEqual(result, "done")
  })
)
```

### it.scopedLive()

Combines scoped + live for tests needing both:

```typescript
it.scopedLive("scoped + live", () =>
  Effect.gen(function* () {
    const resource = yield* acquireResource
    yield* TestClock.adjust(Duration.seconds(10))
    const result = yield* useResource(resource)
    strictEqual(result, "expected")
  })
)
```

## Testing Schema Classes

Test Schema classes using constructors and validation:

```typescript
import { Schema } from "effect"
import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"

class User extends Schema.Class<User>("User")({
  name: Schema.NonEmptyString,
  age: Schema.Int.pipe(Schema.greaterThan(0)),
}) {}

describe("User", () => {
  it("creates valid user", () => {
    const user = new User({ name: "Alice", age: 30 })
    strictEqual(user.name, "Alice")
    strictEqual(user.age, 30)
  })

  it("validates on construction", () => {
    // Throws ParseError for invalid data
    expect(() => new User({ name: "", age: 30 })).toThrow()
  })

  it.effect("decodes from unknown", () =>
    Effect.gen(function* () {
      const data = { name: "Bob", age: 25 }
      const user = yield* Schema.decodeUnknown(User)(data)
      strictEqual(user.name, "Bob")
    })
  )
})
```

## Testing TaggedClass Unions

Test discriminated unions with pattern matching:

```typescript
import { Match, Schema } from "effect"

class Success extends Schema.TaggedClass<Success>()("Success", {
  value: Schema.Number,
}) {}

class Failure extends Schema.TaggedClass<Failure>()("Failure", {
  error: Schema.String,
}) {}

const Result = Schema.Union(Success, Failure)
type Result = typeof Result.Type

describe("Result", () => {
  it("matches success", () => {
    const success = new Success({ value: 42 })
    const result = Match.value(success).pipe(
      Match.tag("Success", ({ value }) => value),
      Match.tag("Failure", () => 0),
      Match.exhaustive
    )
    strictEqual(result, 42)
  })

  it("matches failure", () => {
    const failure = new Failure({ error: "oops" })
    const result = Match.value(failure).pipe(
      Match.tag("Success", ({ value }) => value),
      Match.tag("Failure", ({ error }) => error),
      Match.exhaustive
    )
    strictEqual(result, "oops")
  })
})
```

## Providing Layers

Use `Effect.provide()` inline for test-specific layers:

```typescript
import { Context, Effect, Layer } from "effect"

class Database extends Context.Tag("Database")<
  Database,
  { query: (sql: string) => Effect.Effect<string[]> }
>() {}

const testDatabase = Layer.succeed(Database, {
  query: (_sql) => Effect.succeed(["mock", "data"])
})

it.effect("queries database", () =>
  Effect.gen(function* () {
    const db = yield* Database
    const results = yield* db.query("SELECT * FROM users")
    strictEqual(results.length, 2)
  }).pipe(Effect.provide(testDatabase))
)
```

For file-level layers shared across tests, use the `layer()` helper:

```typescript
import { layer } from "@effect/vitest"

// Register layer once for all tests in this file
layer(testDatabase)

it.effect("uses shared layer", () =>
  Effect.gen(function* () {
    const db = yield* Database
    const results = yield* db.query("SELECT * FROM users")
    strictEqual(results.length, 2)
  })
)
```

## Testing Error Cases

Test expected failures using `Effect.flip()` or `Effect.either()`:

```typescript
// hide-start
const failingEffect = Effect.fail(new Error("expected error"))
// hide-end

it.effect("handles errors", () =>
  Effect.gen(function* () {
    const error = yield* Effect.flip(failingEffect)
    strictEqual(error.message, "expected error")
  })
)

it.effect("returns Left on error", () =>
  Effect.gen(function* () {
    const result = yield* Effect.either(failingEffect)
    assertTrue(Either.isLeft(result))
  })
)
```

## Common Patterns

### Don't use async/await with it.effect()

```typescript
// hide-start
const someEffect = Effect.succeed("expected")
// hide-end

// ❌ Wrong - don't use async/await
it.effect("wrong", async () => {
  const result = await Effect.runPromise(someEffect)
  strictEqual(result, "expected")
})

// ✅ Correct - return Effect directly
it.effect("correct", () =>
  Effect.gen(function* () {
    const result = yield* someEffect
    strictEqual(result, "expected")
  })
)
```

### Assertions inside Effect.gen

```typescript
// hide-start
const program = Effect.succeed("expected")
// hide-end

// ❌ Wrong - assertion after runPromise
it("wrong", async () => {
  const result = await Effect.runPromise(program)
  strictEqual(result, "expected")
})

// ✅ Correct - assertion inside Effect
it.effect("correct", () =>
  Effect.gen(function* () {
    const result = yield* program
    strictEqual(result, "expected")
  })
)
```

### Use describe for grouping

```typescript
describe("UserService", () => {
  describe("createUser", () => {
    it.effect("creates valid user", () => Effect.void)
    it.effect("rejects invalid email", () => Effect.void)
  })

  describe("getUser", () => {
    it.effect("returns existing user", () => Effect.void)
    it.effect("fails for missing user", () => Effect.void)
  })
})
```

## Running Tests

Run tests with vitest:

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Run specific file
bunx vitest run tests/user.test.ts

# Run tests matching pattern
bunx vitest run -t "UserService"
```

## Next Steps

- Use [TestClock](https://effect.website/docs/guides/testing/test-clock) for time-dependent tests
- Use [TestRandom](https://effect.website/docs/guides/testing/test-random) for deterministic randomness
- See [Testing documentation](https://effect.website/docs/guides/testing/introduction) for advanced patterns
