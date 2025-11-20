---
title: Data Types
description: "Schema classes, unions, brands, and JSON serialization"
order: 5
---

# Data Types

TypeScript's built-in tools for modeling data are limited. Effect's Schema library provides a robust alternative with runtime validation, serialization, and type safety built in.

## Why Schema?

- **Runtime validation** – parse untyped data (HTTP, CLI, config) safely.
- **Serialization** – encode rich domain objects to JSON/DTOs with one definition.
- **Branding** – prevent ID mix-ups without hand-written wrappers.
- **Tooling** – share types between the CLI and website without duplicating logic.

## Schema Classes

Use `Schema.Class` for composite data models with multiple fields:

```typescript
import { Schema } from "effect"

const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

export class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
  createdAt: Schema.Date,
}) {}

// Usage
const user = User.make({
  id: UserId.make("user-123"),
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date(),
})
```

## Schema Unions

Use `Schema.Union` for types that can be one of several variants:

```typescript
import { Schema } from "effect"

const Status = Schema.Literal("pending", "active", "completed")
type Status = typeof Status.Type // "pending" | "active" | "completed"
```

For more complex unions with multiple fields per variant, use `Schema.TaggedClass`:

```typescript
import { Match, Schema } from "effect"

// Define variants with a tag field
export class Success extends Schema.TaggedClass<Success>()("Success", {
  value: Schema.Number,
}) {}

export class Failure extends Schema.TaggedClass<Failure>()("Failure", {
  error: Schema.String,
}) {}

// Create the union
export const Result = Schema.Union(Success, Failure)
export type Result = typeof Result.Type

// Pattern 1: Match.value - inline matching
const handleResultInline = (result: Result) =>
  Match.value(result).pipe(
    Match.tag("Success", ({ value }) => `Got: ${value}`),
    Match.tag("Failure", ({ error }) => `Error: ${error}`),
    Match.exhaustive
  )

// Pattern 2: Match.type - extract matcher (compiled once, better perf)
const matcher = Match.type<Result>().pipe(
  Match.tag("Success", ({ value }) => `Got: ${value}`),
  Match.tag("Failure", ({ error }) => `Error: ${error}`),
  Match.exhaustive
)

const handleResult = (result: Result) => matcher(result)

// Pattern 3: Match.tags - handle multiple tags together
const isOk = Match.type<Result>().pipe(
  Match.tag("Success", () => true),
  Match.orElse(() => false)
)

// Usage - TaggedClass uses constructor, not .make()
const success = new Success({ value: 42 })
const failure = new Failure({ error: "oops" })

handleResult(success) // "Got: 42"
handleResult(failure) // "Error: oops"
isOk(success) // true
isOk(failure) // false
```

**Benefits:**

- Type-safe exhaustive matching
- Compiler ensures all cases handled
- No possibility of invalid states

## Branded Types

Use branded types to prevent mixing values that have the same underlying type. **In a well-designed domain model, nearly all primitives should be branded** - not just IDs, but emails, URLs, timestamps, slugs, counts, percentages, and any value with semantic meaning.

```typescript
import { Schema } from "effect"

// IDs - prevent mixing different entity IDs
export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const PostId = Schema.String.pipe(Schema.brand("PostId"))
export type PostId = typeof PostId.Type

// Domain primitives - create a rich type system
export const Email = Schema.String.pipe(Schema.brand("Email"))
export type Email = typeof Email.Type

export const Slug = Schema.String.pipe(Schema.brand("Slug"))
export type Slug = typeof Slug.Type

export const Timestamp = Schema.Number.pipe(Schema.brand("Timestamp"))
export type Timestamp = typeof Timestamp.Type

export const Count = Schema.Number.pipe(Schema.brand("Count"))
export type Count = typeof Count.Type

// Usage - impossible to mix types
const userId = UserId.make("user-123")
const postId = PostId.make("post-456")
const email = Email.make("alice@example.com")
const slug = Slug.make("hello-world")

function getUser(id: UserId) { return id }
function sendEmail(to: Email) { return to }

// ❌ All of these produce type errors
// getUser(postId) // Can't pass PostId where UserId expected
// sendEmail(slug) // Can't pass Slug where Email expected
// const bad: UserId = "raw-string" // Can't assign raw string to branded type
```

**Why brand everything?**

- Prevents subtle bugs (passing email where username expected)
- Self-documenting code (function signatures reveal intent)
- Validation at boundaries (Schema.decode enforces rules once)
- Refactoring safety (rename `Email` → `EmailAddress` catches all uses)
- Beautiful domain model (types match business concepts)

## Pattern Summary

1. **Composite types** → `Schema.Class` with `.make()`
2. **Unions** → `Schema.Literal()` for simple enums, `Schema.TaggedClass()` + `Schema.Union()` for complex variants
3. **IDs** → Branded types with `Schema.brand()`
4. **Compose** → Use branded IDs inside schema classes
5. **Never** → Use plain strings for IDs or raw TypeScript types for models

## JSON Encoding & Decoding

Use the same schema to validate unknown input and produce wire-safe JSON payloads:

```typescript
import { Effect, Schema } from "effect"

const decodeUser = Schema.decodeUnknownEffect(User)
const encodeUser = Schema.encodeEffect(User)

const program = Effect.gen(function* () {
  const raw = JSON.parse('{"id":"user-1","name":"Lina","email":"lina@example.com","createdAt":"2025-01-01T00:00:00.000Z"}')
  const user = yield* decodeUser(raw) // fails with ParseError on invalid payload

  const jsonReady = yield* encodeUser(user) // typed as typeof User.Encoded
  const json = JSON.stringify(jsonReady)
  return json
})
```

Having a single source of truth means every boundary (HTTP handlers, CLI arguments, file IO) can reuse the same schema for both validation and serialization.
