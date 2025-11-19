---
title: Services & Layers
order: 3
---

# Services & Layers

Effect's service pattern provides a deterministic way to organize your application through dependency injection. By defining services as Context.Tag classes and composing them into Layers, you create explicit dependency graphs that are type-safe, testable, and modular.

These are best practices to follow when building services and layers.

## Layer Composition

Put live implementations as static properties using **PascalCase** and `.of()` for clarity:

```typescript
import { Context, Effect, Layer } from "effect"

class SomeDependency extends Context.Tag("SomeDependency")<
  SomeDependency,
  { readonly value: string }
>() {}

export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly doSomething: () => Effect.Effect<void>
  }
>() {
  static readonly Live = Layer.effect(
    MyService,
    Effect.gen(function* () {
      const dep = yield* SomeDependency

      return MyService.of({
        doSomething: () => Effect.void,
      })
    })
  )
}

// Usage
const layer = MyService.Live
```

**Naming conventions:**
- Use `Live` for production implementations
- Use `Test` for test doubles
- Use `Mock` for mock implementations
- Always use `.of()` to make it clear what service you're constructing
