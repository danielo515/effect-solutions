---
title: Data Types
order: 5
---

# Data Types

TypeScript's built-in tools for modeling data are limited. Effect's Schema library provides a robust alternative with runtime validation, serialization, and type safety built in.

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

// Pattern match with Match.tag
const handleResult = (result: Result) =>
  Match.value(result).pipe(
    Match.tag("Success", ({ value }) => `Got: ${value}`),
    Match.tag("Failure", ({ error }) => `Error: ${error}`),
    Match.exhaustive
  )

// Alternative: Use Match.tags for multiple tags at once
const isOk = (result: Result) =>
  Match.value(result).pipe(
    Match.tag("Success", () => true),
    Match.orElse(() => false)
  )

// Usage - TaggedClass uses constructor, not .make()
const success = new Success({ value: 42 })
const failure = new Failure({ error: "oops" })

handleResult(success) // "Got: 42"
handleResult(failure) // "Error: oops"
```

**Benefits:**

- Type-safe exhaustive matching
- Compiler ensures all cases handled
- No possibility of invalid states

## Branded Types

Use branded types to prevent mixing values that have the same underlying type. Especially useful for IDs that would otherwise be interchangeable.

```typescript
import { Schema } from "effect"

// Define branded ID types
export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const PostId = Schema.String.pipe(Schema.brand("PostId"))
export type PostId = typeof PostId.Type

// Usage - type safe, can't mix IDs
const userId = UserId.make("user-123")
const postId = PostId.make("post-456")

function getUser(id: UserId) { return id }

// ❌ This won't compile - can't pass PostId where UserId expected
// getUser(postId) // Type error
```

## Pattern Summary

1. **Composite types** → `Schema.Class` with `.make()`
2. **Unions** → `Schema.Literal()` for simple enums, `Schema.TaggedClass()` + `Schema.Union()` for complex variants
3. **IDs** → Branded types with `Schema.brand()`
4. **Compose** → Use branded IDs inside schema classes
5. **Never** → Use plain strings for IDs or raw TypeScript types for models
