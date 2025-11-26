---
title: HTTP Clients
description: "FetchHttpClient + Schema for typed REST calls"
order: 11
draft: true
---

# HTTP Clients (Draft)

Effect wraps Bun/Node fetch so you can build typed REST clients that share schemas with your domain models.

## Install

```bash
bun add @effect/platform
```

## Fetch JSON with Schema validation

```typescript
import { HttpClient, HttpClientRequest, HttpClientResponse, FetchHttpClient } from "@effect/platform"
import { Effect, Schema } from "effect"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
}) {}

const request = HttpClientRequest.get("https://api.example.com/users/42").pipe(
  HttpClientRequest.acceptJson
  // Add auth: HttpClientRequest.bearerToken(token)
)

const fetchUser = HttpClient.execute(request).pipe(
  HttpClientResponse.schemaBodyJson(User)
)

await fetchUser.pipe(Effect.provide(FetchHttpClient.layer), Effect.runPromise)
```

### Notes

- `HttpClientRequest.acceptJson` sets headers; use other helpers for query params, timeouts, retries, etc.
- `HttpClientResponse.schemaBodyJson` uses the schema to parse and validate the payload, so malformed responses fail fast with `ConfigError`.
- Compose middleware with `HttpClient.mapRequest` / `mapEffect` when you need retries, logging, or auth injection.

## Batching calls with Layers

```typescript
import { HttpClient, HttpClientResponse, FetchHttpClient } from "@effect/platform"
import { Effect, Layer, Schema } from "effect"

class User extends Schema.Class<User>("User")({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
}) {}

const httpLayer = FetchHttpClient.layer

const listUsers = HttpClient.get("https://api.example.com/users").pipe(
  HttpClientResponse.schemaBodyJson(Schema.Array(User))
)

const program = Effect.gen(function* () {
  const users = yield* listUsers
  return users.slice(0, 5)
}).pipe(Effect.provide(httpLayer))
```

This keeps HTTP wiring out of your business code and lets CLI and tests share the same typed client.
