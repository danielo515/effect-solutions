---
title: Configuration
description: "Effect Config usage, providers, and layer patterns"
order: 7
---

# Configuration

Effect's `Config` module provides type-safe configuration loading with validation, defaults, and transformations.

## How Config Works

By default, Effect loads config from **environment variables**. However, you can provide different config sources using `ConfigProvider`:

- **Production:** Load from environment variables (default)
- **Tests:** Load from in-memory maps
- **Development:** Load from JSON files or hardcoded values

This is controlled via `Layer.setConfigProvider`.

## Basic Usage

By default, `Config` reads from environment variables:

```typescript
import { Config, Effect } from "effect"

const program = Effect.gen(function* () {
  // Reads from process.env.API_KEY and process.env.PORT
  const apiKey = yield* Config.redacted("API_KEY")
  const port = yield* Config.integer("PORT")

  console.log(`Starting server on port ${port}`)
  // apiKey is redacted in logs
})

// Run with default provider (environment variables)
Effect.runPromise(program)
```

You can override the default provider for tests or different environments:

```typescript
import { Config, ConfigProvider, Effect, Layer } from "effect"

const program = Effect.gen(function* () {
  const apiKey = yield* Config.redacted("API_KEY")
  const port = yield* Config.integer("PORT")
  console.log(`Starting server on port ${port}`)
})

// Use a different config source
const testConfigProvider = ConfigProvider.fromMap(
  new Map([
    ["API_KEY", "test-key-123"],
    ["PORT", "3000"],
  ])
)

// Apply the provider
const TestConfigLayer = Layer.setConfigProvider(testConfigProvider)

// Run with test config
Effect.runPromise(program.pipe(Effect.provide(TestConfigLayer)))
```

## Recommended Pattern: Config Layers

**Best practice:** Create a config service with a `layer` export:

```typescript
import { Config, Context, Effect, Layer, Redacted } from "effect"

class ApiConfig extends Context.Tag("ApiConfig")<
  ApiConfig,
  {
    readonly apiKey: Redacted.Redacted
    readonly baseUrl: string
    readonly timeout: number
  }
>() {
  static readonly layer = Layer.effect(
    ApiConfig,
    Effect.gen(function* () {
      const apiKey = yield* Config.redacted("API_KEY")
      const baseUrl = yield* Config.string("API_BASE_URL").pipe(
        Config.orElse(() => Config.succeed("https://api.example.com"))
      )
      const timeout = yield* Config.integer("API_TIMEOUT").pipe(
        Config.orElse(() => Config.succeed(30000))
      )

      return ApiConfig.of({ apiKey, baseUrl, timeout })
    })
  )

  // For tests - hardcoded values
  static readonly testLayer = Layer.succeed(
    ApiConfig,
    ApiConfig.of({
      apiKey: Redacted.make("test-key"),
      baseUrl: "https://test.example.com",
      timeout: 5000,
    })
  )
}
```

**Why this pattern?**
- Separates config loading from business logic
- Easy to swap implementations (layer vs testLayer)
- Config errors caught early at layer composition
- Type-safe throughout your app

## Config Primitives

```typescript
import { Config } from "effect"

// Strings
Config.string("MY_VAR")

// Numbers
Config.number("PORT")
Config.integer("MAX_RETRIES")

// Booleans
Config.boolean("DEBUG")

// Sensitive values (redacted in logs)
Config.redacted("API_KEY")

// URLs
Config.url("API_URL")

// Durations
Config.duration("TIMEOUT")

// Arrays (comma-separated values in env vars)
Config.array(Config.string(), "TAGS")
```

## Defaults and Fallbacks

```typescript
import { Config, Effect } from "effect"

const program = Effect.gen(function* () {
  // With orElse
  const port = yield* Config.integer("PORT").pipe(
    Config.orElse(() => Config.succeed(3000))
  )

  // Optional values
  const optionalKey = yield* Config.option(Config.string("OPTIONAL_KEY"))
  // Returns Option<string>

  return { port, optionalKey }
})
```

## Validation and Transformation

```typescript
import { Config, ConfigError, Effect } from "effect"

const program = Effect.gen(function* () {
  // Validate with mapOrFail
  const port = yield* Config.integer("PORT").pipe(
    Config.mapOrFail((p) =>
      p > 0 && p < 65536
        ? Effect.succeed(p)
        : Effect.fail(ConfigError.InvalidData([], "Port must be 1-65535"))
    )
  )

  // Transform values
  const uppercased = yield* Config.string("ENV").pipe(
    Config.map((s) => s.toUpperCase())
  )

  return { port, uppercased }
})
```

## Config Providers

Override where config is loaded from using `Layer.setConfigProvider`:

```typescript
import { ConfigProvider, Layer } from "effect"

const TestConfigLayer = Layer.setConfigProvider(
  ConfigProvider.fromMap(
    new Map([
      ["API_KEY", "test-key"],
      ["PORT", "3000"],
    ])
  )
)

const JsonConfigLayer = Layer.setConfigProvider(
  ConfigProvider.fromJson({
    API_KEY: "prod-key",
    PORT: 8080,
  })
)

const PrefixedConfigLayer = Layer.setConfigProvider(
  ConfigProvider.fromEnv().pipe(
    ConfigProvider.nested("APP") // Reads APP_API_KEY, APP_PORT, etc.
  )
)

// Usage: provide whichever layer matches the environment
Effect.runPromise(program.pipe(Effect.provide(TestConfigLayer)))
```

## Usage in Tests

Combine provider overrides with dedicated test layers for your config services:

```typescript
import { Config, ConfigProvider, Context, Effect, Layer, Redacted } from "effect"

class ApiConfig extends Context.Tag("ApiConfig")<ApiConfig, { apiKey: Redacted.Redacted }>() {
  static readonly layer = Layer.effect(
    ApiConfig,
    Effect.gen(function* () {
      const apiKey = yield* Config.redacted("API_KEY")
      return ApiConfig.of({ apiKey })
    })
  )

  static readonly testLayer = Layer.succeed(ApiConfig, ApiConfig.of({ apiKey: Redacted.make("test-key") }))
}

const TestConfigProvider = Layer.setConfigProvider(
  ConfigProvider.fromMap(new Map([["API_KEY", "test-key"]]))
)

const program = Effect.gen(function* () {
  const config = yield* ApiConfig
  // Use config...
})

// Production
Effect.runPromise(program.pipe(Effect.provide(ApiConfig.layer)))

// Tests - override the provider + use the testLayer for dependencies
Effect.runPromise(
  program.pipe(
    Effect.provide(TestConfigProvider),
    Effect.provide(ApiConfig.testLayer)
  )
)
```

## Using Redacted for Secrets

Always use `Config.redacted()` for sensitive values:

```typescript
import { Config, Effect, Redacted } from "effect"

const program = Effect.gen(function* () {
  const apiKey = yield* Config.redacted("API_KEY")

  // Use Redacted.value() to extract
  const headers = {
    Authorization: `Bearer ${Redacted.value(apiKey)}`
  }

  // Redacted values are hidden in logs
  console.log(apiKey) // Output: <redacted>

  return headers
})
```

## Best Practices

1. **Always validate:** Use `mapOrFail` for critical config values
2. **Use defaults wisely:** Provide sensible defaults for non-critical settings
3. **Redact secrets:** Use `Config.redacted()` for tokens, passwords, API keys
4. **Group related config:** Use `Config.nested()` for prefixed environment variables
5. **Type safety:** Let Effect infer types from your Config declarations
6. **Layer composition:** Create config layers with `Layer.effect()` and static `layer` properties

## Example: Database Config Layer

```typescript
import { Config, ConfigError, Context, Effect, Layer, Redacted } from "effect"

class DatabaseConfig extends Context.Tag("DatabaseConfig")<
  DatabaseConfig,
  {
    readonly host: string
    readonly port: number
    readonly database: string
    readonly password: Redacted.Redacted
  }
>() {
  static readonly layer = Layer.effect(
    DatabaseConfig,
    Effect.gen(function* () {
      const host = yield* Config.string("DB_HOST")
      const port = yield* Config.integer("DB_PORT").pipe(
        Config.mapOrFail((p) =>
          p > 0 && p < 65536
            ? Effect.succeed(p)
            : Effect.fail(ConfigError.InvalidData([], "Invalid port"))
        )
      )
      const database = yield* Config.string("DB_NAME")
      const password = yield* Config.redacted("DB_PASSWORD")

      return DatabaseConfig.of({ host, port, database, password })
    })
  )
}
```
