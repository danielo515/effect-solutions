---
title: Error Handling
order: 6
---

# Error Handling

Effect provides structured error handling with Schema integration for serializable, type-safe errors.

## Schema.TaggedError

Define domain errors with `Schema.TaggedError`:

```typescript
import { Schema } from "effect"

class ValidationError extends Schema.TaggedError<ValidationError>()("ValidationError", {
  field: Schema.String,
  message: Schema.String,
}) {
  get description(): string {
    return `${this.field}: ${this.message}`
  }
}

class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  resource: Schema.String,
  id: Schema.String,
}) {}

// Usage
const error = ValidationError.make({
  field: "email",
  message: "Invalid format",
})
```

**Benefits:**

- Serializable (can send over network/save to DB)
- Type-safe
- Built-in `_tag` for pattern matching
- Custom methods via class

## Pattern Matching on Errors

Use `Match.tag` for exhaustive error handling:

```typescript
import { Match, Schema } from "effect"

class ValidationError extends Schema.TaggedError<ValidationError>()("ValidationError", {
  field: Schema.String,
  message: Schema.String,
}) {
  get description(): string {
    return `${this.field}: ${this.message}`
  }
}

class NotFoundError extends Schema.TaggedError<NotFoundError>()("NotFoundError", {
  resource: Schema.String,
  id: Schema.String,
}) {}

type AppError = ValidationError | NotFoundError

const handleError = (error: AppError) =>
  Match.value(error).pipe(
    Match.tag("ValidationError", (e) => `Validation failed: ${e.description}`),
    Match.tag("NotFoundError", (e) => `${e.resource} with id ${e.id} not found`),
    Match.exhaustive
  )
```

## Schema.Defect - Wrapping Unknown Errors

Use `Schema.Defect` to wrap unknown errors from external libraries:

```typescript
import { Schema, Effect } from "effect"

class ApiError extends Schema.TaggedError<ApiError>()("ApiError", {
  endpoint: Schema.String,
  statusCode: Schema.Number,
  // Wrap the underlying error from fetch/axios/etc
  cause: Schema.Defect
}) {}

// Usage - catching errors from external libraries
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r: Response) => r.json()),
    catch: (error) => ApiError.make({
      endpoint: `/api/users/${id}`,
      statusCode: 500,
      cause: error // Unknown error from fetch wrapped in Schema.Defect
    })
  })
```

**Schema.Defect handles:**

- JavaScript `Error` instances → `{ name, message }` objects
- Any unknown value → string representation
- Serializable for network/storage

**Use for:**

- Wrapping errors from external libraries (fetch, axios, etc)
- Network boundaries (API errors)
- Persisting errors to DB
- Logging systems

## Pattern Summary

1. **Domain errors** → `Schema.TaggedError()`
2. **Error matching** → `Match.tag()` with exhaustive checking
3. **Wrap unknown errors** → `Schema.Defect` (from external libraries)
4. **Always** → Make errors serializable for production systems
