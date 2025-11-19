# Data Types

TypeScript's structural typing can lead to bugs. We use Effect Schema with branded types for type safety.

## IDs - Always Branded

```typescript
// Define branded ID types
export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const PostId = Schema.String.pipe(Schema.brand("PostId"))
export type PostId = typeof PostId.Type

// Usage - type safe, can't mix IDs
const userId = UserId.make("user-123")
const postId = PostId.make("post-456")

// ❌ This won't compile
function getUser(id: UserId) { ... }
getUser(postId) // Type error!
```

## Schema Classes

Use `Schema.Class` for data models. Always construct with `.make()`:

```typescript
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

## Literals

Use `Schema.Literal` for finite sets of values:

```typescript
const Status = Schema.Literal("pending", "active", "completed")
type Status = typeof Status.Type // "pending" | "active" | "completed"
```

## Discriminated Unions (Sealed Traits)

Use `Schema.TaggedClass` for discriminated unions - the Effect equivalent of sealed traits:

```typescript
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
import { Match } from "effect"

const handleResult = (result: Result) =>
  Match.value(result).pipe(
    Match.tag("Success", ({ value }) => `Got: ${value}`),
    Match.tag("Failure", ({ error }) => `Error: ${error}`),
    Match.exhaustive
  )

// Alternative: Use Match.tags for multiple tags at once
const isOk = (result: Result) =>
  Match.value(result).pipe(
    Match.tags("Success", () => true),
    Match.orElse(() => false)
  )

// Usage
const success = Success.make({ value: 42 })
const failure = Failure.make({ error: "oops" })

handleResult(success) // "Got: 42"
handleResult(failure) // "Error: oops"
```

**Benefits:**

- Type-safe exhaustive matching
- Compiler ensures all cases handled
- No possibility of invalid states

## Pattern Summary

1. **IDs** → Branded types with `Schema.brand()`
2. **Data models** → `Schema.Class` with `.make()`
3. **Literals** → `Schema.Literal()` for enums/const values
4. **Sealed traits** → `Schema.TaggedClass()` + `Schema.Union()`
5. **Compose** → Use branded IDs inside schema classes
6. **Never** → Use plain strings for IDs
