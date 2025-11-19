---
title: Services & Layers
description: "Context.Tag and Layer patterns for dependency injection"
order: 3
---

# Services & Layers

Effect's service pattern provides a deterministic way to organize your application through dependency injection. By defining services as Context.Tag classes and composing them into Layers, you create explicit dependency graphs that are type-safe, testable, and modular.

These are best practices to follow when building services and layers.

## Designing with Services First

Start by sketching the service tags—no implementations—so you can reason about boundaries and dependencies before writing any production code.

```typescript
import { Context, Effect, Layer } from "effect"

// Service contracts only
class Database extends Context.Tag("@app/Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[]>
    readonly execute: (sql: string) => Effect.Effect<void>
  }
>() {}

class Cache extends Context.Tag("@app/Cache")<
  Cache,
  {
    readonly get: (key: string) => Effect.Effect<string | null>
    readonly set: (key: string, value: string) => Effect.Effect<void>
  }
>() {}

class Logger extends Context.Tag("@app/Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>
  }
>() {}

class UserService extends Context.Tag("@app/UserService")<
  UserService,
  {
    readonly getUser: (id: string) => Effect.Effect<unknown>
  }
>() {
  static readonly layer = Layer.effect(
    UserService,
    Effect.gen(function* () {
      const db = yield* Database
      const cache = yield* Cache
      const logger = yield* Logger

      const getUser = Effect.fn("UserService.getUser")(function* (id: string) {
        yield* logger.log(`Fetching user ${id}`)
        const cached = yield* cache.get(`user:${id}`)
        if (cached) return JSON.parse(cached)

        const result = yield* db.query(`SELECT * FROM users WHERE id = ?`)
        return result[0]
      })

      return UserService.of({ getUser })
    })
  )
}
```

Benefits:

- Service contracts are explicit before any concrete layers exist.
- You can model orchestration logic and types in isolation.
- Adding mocks or production implementations later doesn't change call sites.

## Mock Implementations

When designing with services first, create lightweight mock implementations for testing. Use `Effect.sync` or `Effect.succeed` when your mock doesn't need async operations or effects.

```typescript
import { Context, Effect, Layer } from "effect"

class Database extends Context.Tag("@app/Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[]>
    readonly execute: (sql: string) => Effect.Effect<void>
  }
>() {
  // Mock using in-memory state
  static readonly mockLayer = Layer.sync(Database, () => {
    let records: Record<string, unknown> = {
      "user-1": { id: "user-1", name: "Alice" },
      "user-2": { id: "user-2", name: "Bob" }
    }

    return Database.of({
      query: (sql) => Effect.succeed(Object.values(records)),
      execute: (sql) => Effect.sync(() => {
        // Parse and mutate records in-memory
        console.log(`Mock execute: ${sql}`)
      })
    })
  })

  // Production using Effect.gen for async operations
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const pool = yield* createConnectionPool()

      return Database.of({
        query: (sql) => Effect.tryPromise(() => pool.query(sql)),
        execute: (sql) => Effect.tryPromise(() => pool.execute(sql))
      })
    })
  )
}

class Cache extends Context.Tag("@app/Cache")<
  Cache,
  {
    readonly get: (key: string) => Effect.Effect<string | null>
    readonly set: (key: string, value: string) => Effect.Effect<void>
  }
>() {
  // Mock with Map
  static readonly mockLayer = Layer.sync(Cache, () => {
    const store = new Map<string, string>()

    return Cache.of({
      get: (key) => Effect.succeed(store.get(key) ?? null),
      set: (key, value) => Effect.sync(() => void store.set(key, value))
    })
  })

  // Production
  static readonly layer = Layer.effect(
    Cache,
    Effect.gen(function* () {
      const redis = yield* connectToRedis()

      return Cache.of({
        get: (key) => Effect.tryPromise(() => redis.get(key)),
        set: (key, value) => Effect.tryPromise(() => redis.set(key, value))
      })
    })
  )
}
```

**Layer naming:**
- All layer properties end with `Layer` suffix
- Use `layer` for the production implementation
- Use `mockLayer`, `testLayer`, etc. for test variants
- Use `liveLayer`, `legacyLayer`, etc. only when multiple production variants exist

**When to use each constructor:**
- `Layer.sync()` - synchronous setup, returns service immediately
- `Layer.effect()` - async setup or needs to yield from other services
- `Layer.succeed()` - static service with no setup logic

## Layer Composition

Put layer implementations as static properties using **camelCase** and `.of()` for clarity.

**Tag identifiers must be fully unique** - use a path-like prefix (e.g., `@app/ServiceName` or `app/ServiceName`) to avoid collisions across your application:

```typescript
import { Config, Context, Effect, Layer, Redacted } from "effect"

// Config service using Config primitives
class AppConfig extends Context.Tag("@app/AppConfig")<
  AppConfig,
  { readonly apiUrl: string; readonly timeout: number; readonly token: Redacted.Redacted }
>() {
  static readonly layer = Layer.effect(
    AppConfig,
    Effect.gen(function* () {
      const apiUrl = yield* Config.string("API_URL").pipe(
        Config.orElse(() => Config.succeed("https://api.example.com"))
      )
      const timeout = yield* Config.integer("API_TIMEOUT").pipe(
        Config.orElse(() => Config.succeed(5000))
      )
      const token = yield* Config.redacted("API_TOKEN")

      return AppConfig.of({ apiUrl, timeout, token })
    })
  )
}

// Service that depends on config
export class ApiClient extends Context.Tag("@app/ApiClient")<
  ApiClient,
  {
    readonly fetch: (path: string) => Effect.Effect<string>
  }
>() {
  static readonly layer = Layer.effect(
    ApiClient,
    Effect.gen(function* () {
      const config = yield* AppConfig

      const fetch = Effect.fn("ApiClient.fetch")(function* (path: string) {
        const url = `${config.apiUrl}${path}`
        yield* Effect.log(
          `Fetching ${url} (timeout: ${config.timeout}ms, token: ${Redacted.value(
            config.token
          )})`
        )
        return `Response from ${url}`
      })

      return ApiClient.of({ fetch })
    })
  )
}

// Combine layers
const mainLayer = ApiClient.layer.pipe(
  Layer.provide(AppConfig.layer)
)

// Usage
const program = Effect.gen(function* () {
  const client = yield* ApiClient
  const result = yield* client.fetch("/users")
  yield* Effect.log(result)
})

const main = program.pipe(Effect.provide(mainLayer))
```

**Naming conventions:**
- Tag identifiers: `@app/ServiceName` or `app/module/ServiceName` for uniqueness
- Use `layer` for production layer implementations (lowercase)
- Use `test` for test layer doubles (lowercase)
- Use `mock` for mock layer implementations (lowercase)
- Always use `.of()` to make it clear what service you're constructing
