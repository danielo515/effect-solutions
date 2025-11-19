# Best Practices

## Layer Composition

Put live implementations as static properties:

```typescript
export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly doSomething: () => Effect.Effect<void>
  }
>() {
  static live = Layer.effect(
    MyService,
    Effect.gen(function* () {
      const dep = yield* SomeDependency

      return {
        doSomething: () => Effect.void,
      }
    })
  )
}

// Usage
const layer = MyService.live
```

## Effect.fn for Effectful Functions

Prefer `Effect.fn` for service methods:

```typescript
const processUser = Effect.fn("processUser")((userId: string) =>
  Effect.gen(function* () {
    const user = yield* getUser(userId)
    const processed = yield* processData(user)
    return processed
  })
)

// Usage
const result = yield * processUser("user-123")
```

**Benefits:** Named for debugging, clean signatures, composable, better inference.

## Effect.gen for Sequential Operations

```typescript
Effect.gen(function* () {
  const data = yield* fetchData()
  const processed = yield* processData(data)
  return yield* saveData(processed)
})
```

## Imports

- Import classes/values **without** `type` (for constructors)
- Use `type` only for interfaces/type aliases

```typescript
// ✅ Good
import { Episode, EpisodeId } from "../types.js"
import type { FetchTimeWindows } from "./DataAggregator.js"

// ❌ Bad - can't use Episode.make()
import type { Episode } from "../types.js"
```
