// 04-services-and-layers.md:20 (block 1)
import { Context, Effect } from "effect"

class Database extends Context.Tag("@app/Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[]>
    readonly execute: (sql: string) => Effect.Effect<void>
  }
>() {}

class Logger extends Context.Tag("@app/Logger")<
  Logger,
  {
    readonly log: (message: string) => Effect.Effect<void>
  }
>() {}

// 04-services-and-layers.md:51 (block 2)
import { HttpClient, HttpClientResponse } from "@effect/platform"
import { Context, Effect, Layer, Schema } from "effect"

const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
}) {}

class UserNotFoundError extends Schema.TaggedError<UserNotFoundError>()(
  "UserNotFoundError",
  {
    id: UserId,
  }
) {}

class GenericUsersError extends Schema.TaggedError<GenericUsersError>()(
  "GenericUsersError",
  {
    id: UserId,
    error: Schema.Defect,
  }
) {}

const UsersError = Schema.Union(UserNotFoundError, GenericUsersError)
type UsersError = typeof UsersError.Type

class Analytics extends Context.Tag("@app/Analytics")<
  Analytics,
  {
    readonly track: (event: string, data: Record<string, unknown>) => Effect.Effect<void>
  }
>() {}

class Users extends Context.Tag("@app/Users")<
  Users,
  {
    readonly findById: (id: UserId) => Effect.Effect<User, UsersError>
    readonly all: () => Effect.Effect<readonly User[]>
  }
>() {
  static readonly layer = Layer.effect(
    Users,
    Effect.gen(function* () {
      // 1. yield* services you depend on
      const http = yield* HttpClient.HttpClient
      const analytics = yield* Analytics

      // 2. define the service methods with Effect.fn for call-site tracing
      const findById = Effect.fn("Users.findById")(function* (id: UserId) {
        yield* analytics.track("user.find", { id })
        const response = yield* http.get(`https://api.example.com/users/${id}`)
        return yield* HttpClientResponse.schemaBodyJson(User)(response)
      }).pipe(
        Effect.catchTag("ResponseError", (error) =>
          error.response.status === 404
            ? UserNotFoundError.make({ id })
            : GenericUsersError.make({ id, error })
        )
      )

      // Use Effect.fn even for nullary methods (thunks) to enable tracing
      const all = Effect.fn("Users.all")(function* () {
        const response = yield* http.get("https://api.example.com/users")
        return yield* HttpClientResponse.schemaBodyJson(Schema.Array(User))(response)
      })

      // 3. return the service
      return Users.of({ findById, all })
    })
  )
}

// 04-services-and-layers.md:135 (block 3)
import { Clock, Context, Effect, Layer, Schema } from "effect"

// Branded types for IDs
const RegistrationId = Schema.String.pipe(Schema.brand("RegistrationId"))
type RegistrationId = typeof RegistrationId.Type

const EventId = Schema.String.pipe(Schema.brand("EventId"))
type EventId = typeof EventId.Type

const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

const TicketId = Schema.String.pipe(Schema.brand("TicketId"))
type TicketId = typeof TicketId.Type

// Domain models
class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
}) {}

class Registration extends Schema.Class<Registration>("Registration")({
  id: RegistrationId,
  eventId: EventId,
  userId: UserId,
  ticketId: TicketId,
  registeredAt: Schema.Date,
}) {}

class Ticket extends Schema.Class<Ticket>("Ticket")({
  id: TicketId,
  eventId: EventId,
  code: Schema.String,
}) {}

// Leaf services: contracts only
class Users extends Context.Tag("@app/Users")<
  Users,
  {
    readonly findById: (id: UserId) => Effect.Effect<User>
  }
>() {}

class Tickets extends Context.Tag("@app/Tickets")<
  Tickets,
  {
    readonly issue: (eventId: EventId, userId: UserId) => Effect.Effect<Ticket>
    readonly validate: (ticketId: TicketId) => Effect.Effect<boolean>
  }
>() {}

class Emails extends Context.Tag("@app/Emails")<
  Emails,
  {
    readonly send: (to: string, subject: string, body: string) => Effect.Effect<void>
  }
>() {}

// Higher-level service: orchestrates leaf services
class Events extends Context.Tag("@app/Events")<
  Events,
  {
    readonly register: (eventId: EventId, userId: UserId) => Effect.Effect<Registration>
  }
>() {
  static readonly layer = Layer.effect(
    Events,
    Effect.gen(function* () {
      const users = yield* Users
      const tickets = yield* Tickets
      const emails = yield* Emails

      const register = Effect.fn("Events.register")(
        function* (eventId: EventId, userId: UserId) {
          const user = yield* users.findById(userId)
          const ticket = yield* tickets.issue(eventId, userId)
          const now = yield* Clock.currentTimeMillis

          const registration = Registration.make({
            id: RegistrationId.make(Schema.randomUUID()),
            eventId,
            userId,
            ticketId: ticket.id,
            registeredAt: new Date(now),
          })

          yield* emails.send(
            user.email,
            "Event Registration Confirmed",
            `Your ticket code: ${ticket.code}`
          )

          return registration
        }
      )

      return Events.of({ register })
    })
  )
}

// 04-services-and-layers.md:254 (block 4)
import { Console, Context, Effect, Layer } from "effect"

class Database extends Context.Tag("@app/Database")<
  Database,
  {
    readonly query: (sql: string) => Effect.Effect<unknown[]>
    readonly execute: (sql: string) => Effect.Effect<void>
  }
>() {
  static readonly testLayer = Layer.sync(Database, () => {
    let records: Record<string, unknown> = {
      "user-1": { id: "user-1", name: "Alice" },
      "user-2": { id: "user-2", name: "Bob" },
    }

    const query = (sql: string) => Effect.succeed(Object.values(records))
    const execute = (sql: string) => Console.log(`Test execute: ${sql}`)

    return Database.of({ query, execute })
  })
}

class Cache extends Context.Tag("@app/Cache")<
  Cache,
  {
    readonly get: (key: string) => Effect.Effect<string | null>
    readonly set: (key: string, value: string) => Effect.Effect<void>
  }
>() {
  static readonly testLayer = Layer.sync(Cache, () => {
    const store = new Map<string, string>()

    const get = (key: string) => Effect.succeed(store.get(key) ?? null)
    const set = (key: string, value: string) => Effect.sync(() => void store.set(key, value))

    return Cache.of({ get, set })
  })
}

// 04-services-and-layers.md:299 (block 5)
import { Context, Effect, Layer } from "effect"
// hide-start
class Config extends Context.Tag("@app/Config")<Config, { readonly apiKey: string }>() {}
class Logger extends Context.Tag("@app/Logger")<Logger, { readonly info: (msg: string) => Effect.Effect<void> }>() {}
class Database extends Context.Tag("@app/Database")<Database, { readonly query: () => Effect.Effect<void> }>() {}
class UserService extends Context.Tag("@app/UserService")<UserService, { readonly getUser: () => Effect.Effect<void> }>() {}
declare const configLayer: Layer.Layer<Config>
declare const loggerLayer: Layer.Layer<Logger>
declare const databaseLayer: Layer.Layer<Database>
declare const userServiceLayer: Layer.Layer<UserService, never, Database>
// hide-end

// Compose all layers into a single app layer
const appLayer = userServiceLayer.pipe(
  Layer.provideMerge(databaseLayer),
  Layer.provideMerge(loggerLayer),
  Layer.provideMerge(configLayer)
)

// Your program uses services freely
const program = Effect.gen(function* () {
  const users = yield* UserService
  const logger = yield* Logger
  yield* logger.info("Starting...")
  yield* users.getUser()
})

// Provide once at the entry point
const main = program.pipe(Effect.provide(appLayer))

Effect.runPromise(main)

// 04-services-and-layers.md:346 (block 6)
import { Layer } from "effect"
// hide-start
import { Context, Effect } from "effect"
class SqlClient extends Context.Tag("@app/SqlClient")<SqlClient, { readonly query: (sql: string) => Effect.Effect<unknown[]> }>() {}
class Postgres { static layer(_: { readonly url: string; readonly poolSize: number }): Layer.Layer<SqlClient> { return Layer.succeed(SqlClient, { query: () => Effect.succeed([]) }) } }
class UserRepo extends Context.Tag("@app/UserRepo")<UserRepo, {}>() {
  static readonly layer: Layer.Layer<UserRepo, never, SqlClient> = Layer.succeed(UserRepo, {})
}
class OrderRepo extends Context.Tag("@app/OrderRepo")<OrderRepo, {}>() {
  static readonly layer: Layer.Layer<OrderRepo, never, SqlClient> = Layer.succeed(OrderRepo, {})
}
// hide-end

// ❌ Bad: calling the constructor twice creates two connection pools
const badAppLayer = Layer.merge(
  UserRepo.layer.pipe(
    Layer.provide(Postgres.layer({ url: "postgres://localhost/mydb", poolSize: 10 }))
  ),
  OrderRepo.layer.pipe(
    Layer.provide(Postgres.layer({ url: "postgres://localhost/mydb", poolSize: 10 })) // Different reference!
  )
)
// Creates TWO connection pools (20 connections total). Could hit server limits.

// 04-services-and-layers.md:374 (block 7)
import { Layer } from "effect"
// hide-start
import { Context, Effect } from "effect"
class SqlClient extends Context.Tag("@app/SqlClient")<SqlClient, { readonly query: (sql: string) => Effect.Effect<unknown[]> }>() {}
class Postgres { static layer(_: { readonly url: string; readonly poolSize: number }): Layer.Layer<SqlClient> { return Layer.succeed(SqlClient, { query: () => Effect.succeed([]) }) } }
class UserRepo extends Context.Tag("@app/UserRepo")<UserRepo, {}>() {
  static readonly layer: Layer.Layer<UserRepo, never, SqlClient> = Layer.succeed(UserRepo, {})
}
class OrderRepo extends Context.Tag("@app/OrderRepo")<OrderRepo, {}>() {
  static readonly layer: Layer.Layer<OrderRepo, never, SqlClient> = Layer.succeed(OrderRepo, {})
}
// hide-end

// ✅ Good: store the layer in a constant
const postgresLayer = Postgres.layer({ url: "postgres://localhost/mydb", poolSize: 10 })

const goodAppLayer = Layer.merge(
  UserRepo.layer.pipe(Layer.provide(postgresLayer)),
  OrderRepo.layer.pipe(Layer.provide(postgresLayer)) // Same reference!
)
// Single connection pool (10 connections) shared by both repos

// 08-testing.md:41 (block 1)
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
})

// 08-testing.md:55 (block 2)
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"

describe("Calculator", () => {
  // Sync test - regular function
  it("creates instances", () => {
    const result = 1 + 1
    expect(result).toBe(2)
  })

  // Effect test - returns Effect
  it.effect("adds numbers", () =>
    Effect.gen(function* () {
      const result = yield* Effect.succeed(1 + 1)
      expect(result).toBe(2)
    })
  )
})

// 08-testing.md:82 (block 3)
it.effect("processes data", () =>
  Effect.gen(function* () {
    const result = yield* processData("input")
    expect(result).toBe("expected")
  })
)

// 08-testing.md:95 (block 4)
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect } from "effect"

it.scoped("temp directory is cleaned up", () =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    // makeTempDirectoryScoped creates a directory that's deleted when scope closes
    const tempDir = yield* fs.makeTempDirectoryScoped()

    // Use the temp directory
    yield* fs.writeFileString(`${tempDir}/test.txt`, "hello")
    const exists = yield* fs.exists(`${tempDir}/test.txt`)
    expect(exists).toBe(true)

    // When test ends, scope closes and tempDir is deleted
  }).pipe(Effect.provide(NodeFileSystem.layer))
)

// 08-testing.md:121 (block 5)
import { Clock, Effect } from "effect"

// it.effect provides TestContext - clock starts at 0
it.effect("test clock starts at zero", () =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    expect(now).toBe(0)
  })
)

// it.live uses real system clock
it.live("real clock", () =>
  Effect.gen(function* () {
    const now = yield* Clock.currentTimeMillis
    expect(now).toBeGreaterThan(0) // Actual system time
  })
)

// 08-testing.md:145 (block 6)
import { Effect, Fiber, TestClock } from "effect"

it.effect("time-based test", () =>
  Effect.gen(function* () {
    const fiber = yield* Effect.delay(Effect.succeed("done"), "10 seconds").pipe(
      Effect.fork
    )
    yield* TestClock.adjust("10 seconds")
    const result = yield* Fiber.join(fiber)
    expect(result).toBe("done")
  })
)

// 08-testing.md:164 (block 7)
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
    expect(results.length).toBe(2)
  }).pipe(Effect.provide(testDatabase))
)

// 08-testing.md:191 (block 8)
it.effect.skip("temporarily disabled", () =>
  Effect.gen(function* () {
    // This test won't run
  })
)

// 08-testing.md:203 (block 9)
it.effect.only("focus on this test", () =>
  Effect.gen(function* () {
    // Only this test runs
  })
)

// 08-testing.md:215 (block 10)
it.effect.fails("known bug", () =>
  Effect.gen(function* () {
    // This test is expected to fail
    expect(1 + 1).toBe(3)
  })
)

// 08-testing.md:228 (block 11)
import { Logger } from "effect"

// Option 1: Provide a logger
it.effect("with logging", () =>
  Effect.gen(function* () {
    yield* Effect.log("This will be shown")
  }).pipe(Effect.provide(Logger.pretty))
)

// Option 2: Use it.live (logging enabled by default)
it.live("live with logging", () =>
  Effect.gen(function* () {
    yield* Effect.log("This will be shown")
  })
)

// 08-testing.md:252 (block 12)
import { Clock, Context, Effect, Layer, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"

// Domain types
const RegistrationId = Schema.String.pipe(Schema.brand("RegistrationId"))
type RegistrationId = typeof RegistrationId.Type

const EventId = Schema.String.pipe(Schema.brand("EventId"))
type EventId = typeof EventId.Type

const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

const TicketId = Schema.String.pipe(Schema.brand("TicketId"))
type TicketId = typeof TicketId.Type

class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
}) {}

class Registration extends Schema.Class<Registration>("Registration")({
  id: RegistrationId,
  eventId: EventId,
  userId: UserId,
  ticketId: TicketId,
  registeredAt: Schema.Date,
}) {}

class Ticket extends Schema.Class<Ticket>("Ticket")({
  id: TicketId,
  eventId: EventId,
  code: Schema.String,
}) {}

class Email extends Schema.Class<Email>("Email")({
  to: Schema.String,
  subject: Schema.String,
  body: Schema.String,
}) {}

class UserNotFound extends Schema.TaggedError<UserNotFound>()("UserNotFound", {
  id: UserId,
}) {}

// Users service with test layer that has create + findById
class Users extends Context.Tag("@app/Users")<
  Users,
  {
    readonly create: (user: User) => Effect.Effect<void>
    readonly findById: (id: UserId) => Effect.Effect<User, UserNotFound>
  }
>() {
  // Mutable state is fine in tests - JS is single-threaded
  static readonly testLayer = Layer.sync(Users, () => {
    const store = new Map<UserId, User>()

    const create = (user: User) => Effect.sync(() => void store.set(user.id, user))

    const findById = (id: UserId) =>
      Effect.fromNullable(store.get(id)).pipe(
        Effect.orElseFail(() => UserNotFound.make({ id }))
      )

    return Users.of({ create, findById })
  })
}

// Tickets service with test layer
class Tickets extends Context.Tag("@app/Tickets")<
  Tickets,
  { readonly issue: (eventId: EventId, userId: UserId) => Effect.Effect<Ticket> }
>() {
  static readonly testLayer = Layer.sync(Tickets, () => {
    let counter = 0

    const issue = (eventId: EventId, _userId: UserId) =>
      Effect.sync(() =>
        Ticket.make({
          id: TicketId.make(`ticket-${counter++}`),
          eventId,
          code: `CODE-${counter}`,
        })
      )

    return Tickets.of({ issue })
  })
}

// Emails service with test layer that tracks sent emails
class Emails extends Context.Tag("@app/Emails")<
  Emails,
  {
    readonly send: (email: Email) => Effect.Effect<void>
    readonly sent: Effect.Effect<ReadonlyArray<Email>>
  }
>() {
  static readonly testLayer = Layer.sync(Emails, () => {
    const emails: Array<Email> = []

    const send = (email: Email) => Effect.sync(() => void emails.push(email))

    const sent = Effect.sync(() => emails)

    return Emails.of({ send, sent })
  })
}

// 08-testing.md:365 (block 13)
class Events extends Context.Tag("@app/Events")<
  Events,
  { readonly register: (eventId: EventId, userId: UserId) => Effect.Effect<Registration, UserNotFound> }
>() {
  static readonly layer = Layer.effect(
    Events,
    Effect.gen(function* () {
      const users = yield* Users
      const tickets = yield* Tickets
      const emails = yield* Emails

      const register = Effect.fn("Events.register")(
        function* (eventId: EventId, userId: UserId) {
          const user = yield* users.findById(userId)
          const ticket = yield* tickets.issue(eventId, userId)
          const now = yield* Clock.currentTimeMillis

          const registration = Registration.make({
            id: RegistrationId.make(crypto.randomUUID()),
            eventId,
            userId,
            ticketId: ticket.id,
            registeredAt: new Date(now),
          })

          yield* emails.send(
            Email.make({
              to: user.email,
              subject: "Event Registration Confirmed",
              body: `Your ticket code: ${ticket.code}`,
            })
          )

          return registration
        }
      )

      return Events.of({ register })
    })
  )
}

// 08-testing.md:411 (block 14)
// provideMerge exposes leaf services in tests for setup/assertions
const testLayer = Events.layer.pipe(
  Layer.provideMerge(Users.testLayer),
  Layer.provideMerge(Tickets.testLayer),
  Layer.provideMerge(Emails.testLayer)
)

describe("Events.register", () => {
  it.effect("creates registration with correct data", () =>
    Effect.gen(function* () {
      const users = yield* Users
      const events = yield* Events

      // Arrange: create a user
      const user = User.make({
        id: UserId.make("user-123"),
        name: "Alice",
        email: "alice@example.com",
      })
      yield* users.create(user)

      // Act
      const eventId = EventId.make("event-789")
      const registration = yield* events.register(eventId, user.id)

      // Assert
      expect(registration.eventId).toBe(eventId)
      expect(registration.userId).toBe(user.id)
    }).pipe(Effect.provide(testLayer))
  )

  it.effect("sends confirmation email with ticket code", () =>
    Effect.gen(function* () {
      const users = yield* Users
      const events = yield* Events
      const emails = yield* Emails

      // Arrange
      const user = User.make({
        id: UserId.make("user-456"),
        name: "Bob",
        email: "bob@example.com",
      })
      yield* users.create(user)

      // Act
      yield* events.register(EventId.make("event-789"), user.id)

      // Assert: check sent emails
      const sentEmails = yield* emails.sent
      expect(sentEmails).toHaveLength(1)
      expect(sentEmails[0].to).toBe("bob@example.com")
      expect(sentEmails[0].subject).toBe("Event Registration Confirmed")
      expect(sentEmails[0].body).toContain("CODE-")
    }).pipe(Effect.provide(testLayer))
  )
})

// 11-http-clients.md:20 (block 1)
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

// 11-http-clients.md:50 (block 2)
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

// 13-cli.md:24 (block 1)
import { Args, Command, Options } from "@effect/cli"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Console, Effect } from "effect"

const name = Args.text({ name: "name" }).pipe(Args.withDefault("World"))
const shout = Options.boolean("shout").pipe(Options.withAlias("s"))

const greet = Command.make("greet", { name, shout }, ({ name, shout }) => {
  const message = `Hello, ${name}!`
  return Console.log(shout ? message.toUpperCase() : message)
})

const cli = Command.run(greet, {
  name: "greet",
  version: "1.0.0"
})

cli(process.argv).pipe(
  Effect.provide(BunContext.layer),
  BunRuntime.runMain
)

// 13-cli.md:65 (block 2)
// Required text
Args.text({ name: "file" })

// Optional argument
Args.text({ name: "output" }).pipe(Args.optional)

// With default
Args.text({ name: "format" }).pipe(Args.withDefault("json"))

// Repeated (zero or more)
Args.text({ name: "files" }).pipe(Args.repeated)

// At least one
Args.text({ name: "files" }).pipe(Args.atLeast(1))

// 13-cli.md:84 (block 3)
// Boolean flag
Options.boolean("verbose").pipe(Options.withAlias("v"))

// Text option
Options.text("output").pipe(Options.withAlias("o"))

// Optional text
Options.text("config").pipe(Options.optional)

// Choice from fixed values
Options.choice("format", ["json", "yaml", "toml"])

// Integer
Options.integer("count").pipe(Options.withDefault(10))

// 13-cli.md:105 (block 4)
const task = Args.text({ name: "task" })

const add = Command.make("add", { task }, ({ task }) =>
  Console.log(`Adding: ${task}`)
)

const list = Command.make("list", {}, () =>
  Console.log("Listing tasks...")
)

const app = Command.make("tasks").pipe(
  Command.withSubcommands([add, list])
)

// 13-cli.md:145 (block 5)
import { Array, Option, Schema } from "effect"

const TaskId = Schema.Number.pipe(Schema.brand("TaskId"))
type TaskId = typeof TaskId.Type

class Task extends Schema.Class<Task>("Task")({
  id: TaskId,
  text: Schema.NonEmptyString,
  done: Schema.Boolean
}) {
  toggle() {
    return Task.make({ ...this, done: !this.done })
  }
}

class TaskList extends Schema.Class<TaskList>("TaskList")({
  tasks: Schema.Array(Task)
}) {
  static Json = Schema.parseJson(TaskList)
  static empty = TaskList.make({ tasks: [] })

  get nextId(): TaskId {
    if (this.tasks.length === 0) return TaskId.make(1)
    return TaskId.make(Math.max(...this.tasks.map((t) => t.id)) + 1)
  }

  add(text: string): [TaskList, Task] {
    const task = Task.make({ id: this.nextId, text, done: false })
    return [TaskList.make({ tasks: [...this.tasks, task] }), task]
  }

  toggle(id: TaskId): [TaskList, Option.Option<Task>] {
    const index = this.tasks.findIndex((t) => t.id === id)
    if (index === -1) return [this, Option.none()]

    const updated = this.tasks[index].toggle()
    const tasks = Array.modify(this.tasks, index, () => updated)
    return [TaskList.make({ tasks }), Option.some(updated)]
  }

  find(id: TaskId): Option.Option<Task> {
    return Array.findFirst(this.tasks, (t) => t.id === id)
  }

  get pending() {
    return this.tasks.filter((t) => !t.done)
  }

  get completed() {
    return this.tasks.filter((t) => t.done)
  }
}

// 13-cli.md:202 (block 6)
import { Context, Effect, Layer, Schema } from "effect"
import { FileSystem } from "@effect/platform"

class TaskRepo extends Context.Tag("TaskRepo")<
  TaskRepo,
  {
    readonly list: (all?: boolean) => Effect.Effect<ReadonlyArray<Task>>
    readonly add: (text: string) => Effect.Effect<Task>
    readonly toggle: (id: TaskId) => Effect.Effect<Option.Option<Task>>
    readonly clear: () => Effect.Effect<void>
  }
>() {
  static layer = Layer.effect(
    TaskRepo,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = "tasks.json"

      // Helpers
      const load = Effect.gen(function* () {
        const content = yield* fs.readFileString(path)
        return yield* Schema.decode(TaskList.Json)(content)
      }).pipe(Effect.orElseSucceed(() => TaskList.empty))

      const save = (list: TaskList) =>
        Effect.gen(function* () {
          const json = yield* Schema.encode(TaskList.Json)(list)
          yield* fs.writeFileString(path, json)
        })

      // Public API
      const list = Effect.fn("TaskRepo.list")(function* (all?: boolean) {
        const taskList = yield* load
        if (all) return taskList.tasks
        return taskList.tasks.filter((t) => !t.done)
      })

      const add = Effect.fn("TaskRepo.add")(function* (text: string) {
        const list = yield* load
        const [newList, task] = list.add(text)
        yield* save(newList)
        return task
      })

      const toggle = Effect.fn("TaskRepo.toggle")(function* (id: TaskId) {
        const list = yield* load
        const [newList, task] = list.toggle(id)
        yield* save(newList)
        return task
      })

      const clear = Effect.fn("TaskRepo.clear")(function* () {
        yield* save(TaskList.empty)
      })

      return { list, add, toggle, clear }
    })
  )
}

// 13-cli.md:266 (block 7)
import { Args, Command, Options } from "@effect/cli"
import { Console } from "effect"

// add <task>
const text = Args.text({ name: "task" }).pipe(
  Args.withDescription("The task description")
)

const addCommand = Command.make("add", { text }, ({ text }) =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo
    const task = yield* repo.add(text)
    yield* Console.log(`Added task #${task.id}: ${task.text}`)
  })
).pipe(Command.withDescription("Add a new task"))

// list [--all]
const all = Options.boolean("all").pipe(
  Options.withAlias("a"),
  Options.withDescription("Show all tasks including completed")
)

const listCommand = Command.make("list", { all }, ({ all }) =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo
    const tasks = yield* repo.list(all)

    if (tasks.length === 0) {
      yield* Console.log("No tasks.")
      return
    }

    for (const task of tasks) {
      const status = task.done ? "[x]" : "[ ]"
      yield* Console.log(`${status} #${task.id} ${task.text}`)
    }
  })
).pipe(Command.withDescription("List pending tasks"))

// toggle <id>
const id = Args.integer({ name: "id" }).pipe(
  Args.withSchema(TaskId),
  Args.withDescription("The task ID to toggle")
)

const toggleCommand = Command.make("toggle", { id }, ({ id }) =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo
    const result = yield* repo.toggle(id)

    yield* Option.match(result, {
      onNone: () => Console.log(`Task #${id} not found`),
      onSome: (task) => Console.log(`Toggled: ${task.text} (${task.done ? "done" : "pending"})`)
    })
  })
).pipe(Command.withDescription("Toggle a task's done status"))

// clear
const clearCommand = Command.make("clear", {}, () =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo
    yield* repo.clear()
    yield* Console.log("Cleared all tasks.")
  })
).pipe(Command.withDescription("Clear all tasks"))

const app = Command.make("tasks", {}).pipe(
  Command.withDescription("A simple task manager"),
  Command.withSubcommands([addCommand, listCommand, toggleCommand, clearCommand])
)

// 13-cli.md:341 (block 8)
import { BunContext, BunRuntime } from "@effect/platform-bun"

const cli = Command.run(app, {
  name: "tasks",
  version: "1.0.0"
})

const MainLayer = Layer.provideMerge(TaskRepo.layer, BunContext.layer)

cli(process.argv).pipe(Effect.provide(MainLayer), BunRuntime.runMain)

// 13-cli.md:414 (block 9)
import pkg from "./package.json" with { type: "json" }

const cli = Command.run(app, {
  name: "tasks",
  version: pkg.version
})

// 06-error-handling.md:15 (block 1)
import { Schema } from "effect"

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    field: Schema.String,
    message: Schema.String,
  }
) {}

class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    resource: Schema.String,
    id: Schema.String,
  }
) {}

const AppError = Schema.Union(ValidationError, NotFoundError)
type AppError = typeof AppError.Type

// Usage
const error = ValidationError.make({
  field: "email",
  message: "Invalid format",
})

// 06-error-handling.md:54 (block 2)
// ✅ Good: Yieldable errors can be used directly
return error.response.status === 404
  ? UserNotFoundError.make({ id })
  : Effect.die(error)

// ❌ Redundant: no need to wrap with Effect.fail
return error.response.status === 404
  ? Effect.fail(UserNotFoundError.make({ id }))
  : Effect.die(error)

// 06-error-handling.md:74 (block 3)
import { Effect, Schema } from "effect"

class HttpError extends Schema.TaggedError<HttpError>()(
  "HttpError",
  {
    statusCode: Schema.Number,
    message: Schema.String,
  }
) {}

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: Schema.String,
  }
) {}

declare const program: Effect.Effect<string, HttpError | ValidationError>

const recovered: Effect.Effect<string, never> = program.pipe(
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      yield* Effect.logError("Error occurred", error)
      return `Recovered from ${error.name}`
    })
  )
)

// 06-error-handling.md:108 (block 4)
import { Effect, Schema } from "effect"

class HttpError extends Schema.TaggedError<HttpError>()(
  "HttpError",
  {
    statusCode: Schema.Number,
    message: Schema.String,
  }
) {}

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: Schema.String,
  }
) {}

const program: Effect.Effect<string, HttpError | ValidationError> =
  HttpError.make({
    statusCode: 500,
    message: "Internal server error",
  })

const recovered: Effect.Effect<string, ValidationError> = program.pipe(
  Effect.catchTag("HttpError", (error) =>
    Effect.gen(function* () {
      yield* Effect.logWarning(`HTTP ${error.statusCode}: ${error.message}`)
      return "Recovered from HttpError"
    })
  )
)

// 06-error-handling.md:146 (block 5)
import { Effect, Schema } from "effect"

class HttpError extends Schema.TaggedError<HttpError>()(
  "HttpError",
  {
    statusCode: Schema.Number,
    message: Schema.String,
  }
) {}

class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: Schema.String,
  }
) {}

const program: Effect.Effect<string, HttpError | ValidationError> =
  HttpError.make({
    statusCode: 500,
    message: "Internal server error",
  })

const recovered: Effect.Effect<string, never> = program.pipe(
  Effect.catchTags({
    HttpError: () => Effect.succeed("Recovered from HttpError"),
    ValidationError: () => Effect.succeed("Recovered from ValidationError")
  })
)

// 06-error-handling.md:186 (block 6)
import { Effect } from "effect"
// hide-start
declare const loadConfig: Effect.Effect<{ port: number }, Error>
// hide-end

// At app entry: if config fails, nothing can proceed
const main = Effect.gen(function* () {
  const config = yield* loadConfig.pipe(Effect.orDie)
  yield* Effect.log(`Starting on port ${config.port}`)
})

// 06-error-handling.md:205 (block 7)
import { Schema, Effect } from "effect"

class ApiError extends Schema.TaggedError<ApiError>()(
  "ApiError",
  {
    endpoint: Schema.String,
    statusCode: Schema.Number,
    // Wrap the underlying error from fetch/axios/etc
    error: Schema.Defect,
  }
) {}

// Usage - catching errors from external libraries
const fetchUser = (id: string) =>
  Effect.tryPromise({
    try: () => fetch(`/api/users/${id}`).then((r: Response) => r.json()),
    catch: (error) => ApiError.make({
      endpoint: `/api/users/${id}`,
      statusCode: 500,
      error
    })
  })

// 12-observability.md:20 (block 1)
import { Effect, Layer } from "effect"
import { BunHttpServer } from "@effect/platform-bun/HttpServer"
import { HttpServerResponse } from "@effect/platform/HttpServerResponse"
import { Otlp, Tracer } from "@effect/opentelemetry"
import { FetchHttpClient } from "@effect/platform/FetchHttpClient"

const otelLayer = Otlp.layer({
  baseUrl: "https://otel-collector.company.dev",
  resource: { serviceName: "effect-app", serviceVersion: "0.1.0" }
}).pipe(
  Layer.provide(FetchHttpClient.layer) // HTTP export
)

const app = HttpServerResponse.text("ok").pipe(
  Effect.withSpan("http.request")
)

Effect.runPromise(
  BunHttpServer.serve(app, { port: 3000 }).pipe(
    Tracer.withSpan("server"),
    Effect.provide(otelLayer)
  )
)

// 12-observability.md:54 (block 2)
import { Effect } from "effect"

const performDbLookup = Effect.gen(function* () {
  yield* Effect.sleep("50 millis").pipe(Effect.withSpan("db.lookup"))
  return { data: "result" }
})

const fetchData = Effect.fn("fetchData")(function* () {
  yield* Effect.log("Fetching data")
  return yield* performDbLookup
})

// 05-data-modeling.md:33 (block 1)
import { Schema } from "effect"

const UserId = Schema.String.pipe(Schema.brand("UserId"))
type UserId = typeof UserId.Type

export class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
  createdAt: Schema.Date,
}) {
  // Add custom getters and methods to extend functionality
  get displayName() {
    return `${this.name} (${this.email})`
  }
}

// Usage
const user = User.make({
  id: UserId.make("user-123"),
  name: "Alice",
  email: "alice@example.com",
  createdAt: new Date(),
})

console.log(user.displayName) // "Alice (alice@example.com)"

// 05-data-modeling.md:66 (block 2)
import { Schema } from "effect"

const Status = Schema.Literal("pending", "active", "completed")
type Status = typeof Status.Type // "pending" | "active" | "completed"

// 05-data-modeling.md:75 (block 3)
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

// Pattern match with Match.valueTags
const success = Success.make({ value: 42 })
const failure = Failure.make({ error: "oops" })

Match.valueTags(success, {
  Success: ({ value }) => `Got: ${value}`,
  Failure: ({ error }) => `Error: ${error}`
}) // "Got: 42"

Match.valueTags(failure, {
  Success: ({ value }) => `Got: ${value}`,
  Failure: ({ error }) => `Error: ${error}`
}) // "Error: oops"

// 05-data-modeling.md:116 (block 4)
import { Schema } from "effect"

// IDs - prevent mixing different entity IDs
export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const PostId = Schema.String.pipe(Schema.brand("PostId"))
export type PostId = typeof PostId.Type

// Domain primitives - create a rich type system
export const Email = Schema.String.pipe(Schema.brand("Email"))
export type Email = typeof Email.Type

export const Port = Schema.Int.pipe(Schema.between(1, 65535), Schema.brand("Port"))
export type Port = typeof Port.Type

// Usage - impossible to mix types
const userId = UserId.make("user-123")
const postId = PostId.make("post-456")
const email = Email.make("alice@example.com")

function getUser(id: UserId) { return id }
function sendEmail(to: Email) { return to }

// This works
getUser(userId)
sendEmail(email)

// All of these produce type errors
// getUser(postId) // Can't pass PostId where UserId expected
// sendEmail(slug) // Can't pass Slug where Email expected
// const bad: UserId = "raw-string" // Can't assign raw string to branded type

// 05-data-modeling.md:155 (block 5)
import { Effect, Schema } from "effect"

const Row = Schema.Literal("A", "B", "C", "D", "E", "F", "G", "H")
const Column = Schema.Literal("1", "2", "3", "4", "5", "6", "7", "8")

class Position extends Schema.Class<Position>("Position")({
  row: Row,
  column: Column,
}) {}

class Move extends Schema.Class<Move>("Move")({
  from: Position,
  to: Position,
}) {}

// parseJson combines JSON.parse + schema decoding
// MoveFromJson is a schema that takes a JSON string and returns a Move
const MoveFromJson = Schema.parseJson(Move)

const program = Effect.gen(function* () {
  // Parse and validate JSON string in one step
  // Use MoveFromJson (not Move) to decode from JSON string
  const jsonString = '{"from":{"row":"A","column":"1"},"to":{"row":"B","column":"2"}}'
  const move = yield* Schema.decodeUnknown(MoveFromJson)(jsonString)

  yield* Effect.log("Decoded move", move)

  // Encode to JSON string in one step (typed as string)
  // Use MoveFromJson (not Move) to encode to JSON string
  const json = yield* Schema.encode(MoveFromJson)(move)
  return json
})

// 03-basics.md:17 (block 1)
import { Effect } from "effect"
// hide-start
declare const fetchData: Effect.Effect<string>
declare const processData: (data: string) => Effect.Effect<string>
// hide-end

const program = Effect.gen(function* () {
  const data = yield* fetchData
  yield* Effect.logInfo(`Processing data: ${data}`)
  return yield* processData(data)
})

// 03-basics.md:35 (block 2)
import { Effect } from "effect"
// hide-start
interface User {
  id: string
  name: string
}
declare const getUser: (userId: string) => Effect.Effect<User>
declare const processData: (user: User) => Effect.Effect<User>
// hide-end

const processUser = Effect.fn("processUser")(function* (userId: string) {
  yield* Effect.logInfo(`Processing user ${userId}`)
  const user = yield* getUser(userId)
  return yield* processData(user)
})

// 03-basics.md:65 (block 3)
import { Effect, Schedule } from "effect"
// hide-start
declare const fetchData: Effect.Effect<string>
// hide-end

const program = fetchData.pipe(
  Effect.timeout("5 seconds"),
  Effect.retry(Schedule.exponential("100 millis").pipe(Schedule.compose(Schedule.recurs(3)))),
  Effect.tap((data) => Effect.logInfo(`Fetched: ${data}`)),
  Effect.withSpan("fetchData")
)

// 03-basics.md:90 (block 4)
import { Effect, Schedule } from "effect"
// hide-start
declare const callExternalApi: Effect.Effect<string>
// hide-end

// Retry with exponential backoff, max 3 attempts
const retryPolicy = Schedule.exponential("100 millis").pipe(
  Schedule.compose(Schedule.recurs(3))
)

const resilientCall = callExternalApi.pipe(
  // Timeout each individual attempt
  Effect.timeout("2 seconds"),
  // Retry failed attempts
  Effect.retry(retryPolicy),
  // Overall timeout for all attempts
  Effect.timeout("10 seconds")
)

// 07-config.md:25 (block 1)
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

// 07-config.md:43 (block 2)
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

// 07-config.md:71 (block 3)
import { Config, Context, Effect, Layer, Redacted } from "effect"

class ApiConfig extends Context.Tag("@app/ApiConfig")<
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

// 07-config.md:117 (block 4)
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

// 07-config.md:145 (block 5)
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

// 07-config.md:166 (block 6)
import { Config, Effect, Schema } from "effect"

// Define schemas with built-in validation
const Port = Schema.Int.pipe(Schema.between(1, 65535))
const Environment = Schema.Literal("development", "staging", "production")

const program = Effect.gen(function* () {
  // Schema handles validation automatically
  const port = yield* Schema.Config("PORT", Port)
  const env = yield* Schema.Config("ENV", Environment)

  return { port, env }
})

// 07-config.md:191 (block 7)
import { Effect, Schema } from "effect"

const Port = Schema.Int.pipe(
  Schema.between(1, 65535),
  Schema.brand("Port")
)
type Port = typeof Port.Type

const program = Effect.gen(function* () {
  const port = yield* Schema.Config("PORT", Port)
  // port is branded as Port, preventing misuse
  return port
})

// 07-config.md:211 (block 8)
import { Config, ConfigError, Effect } from "effect"

const program = Effect.gen(function* () {
  const port = yield* Config.integer("PORT").pipe(
    Config.mapOrFail((p) =>
      p > 0 && p < 65536
        ? Effect.succeed(p)
        : Effect.fail(ConfigError.InvalidData([], "Port must be 1-65535"))
    )
  )

  return port
})

// 07-config.md:231 (block 9)
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

// 07-config.md:264 (block 10)
import { Config, Context, Effect, Layer, Redacted } from "effect"

class ApiConfig extends Context.Tag("@app/ApiConfig")<
  ApiConfig,
  {
    readonly apiKey: Redacted.Redacted
    readonly baseUrl: string
  }
>() {
  static readonly layer = Layer.effect(
    ApiConfig,
    Effect.gen(function* () {
      const apiKey = yield* Config.redacted("API_KEY")
      const baseUrl = yield* Config.string("API_BASE_URL")
      return ApiConfig.of({ apiKey, baseUrl })
    })
  )
}

const program = Effect.gen(function* () {
  const config = yield* ApiConfig
  console.log(config.baseUrl)
})

// Production: reads from environment variables
Effect.runPromise(program.pipe(Effect.provide(ApiConfig.layer)))

// Tests: inline test values as needed
Effect.runPromise(
  program.pipe(
    Effect.provide(
      Layer.succeed(ApiConfig, {
        apiKey: Redacted.make("test-key"),
        baseUrl: "https://test.example.com"
      })
    )
  )
)

// Different test with different values
Effect.runPromise(
  program.pipe(
    Effect.provide(
      Layer.succeed(ApiConfig, {
        apiKey: Redacted.make("another-key"),
        baseUrl: "https://staging.example.com"
      })
    )
  )
)

// 07-config.md:328 (block 11)
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

// 07-config.md:357 (block 12)
import { Context, Effect, Layer, Redacted, Schema } from "effect"

const Port = Schema.Int.pipe(Schema.between(1, 65535))

class DatabaseConfig extends Context.Tag("@app/DatabaseConfig")<
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
      const host = yield* Schema.Config("DB_HOST", Schema.String)
      const port = yield* Schema.Config("DB_PORT", Port)
      const database = yield* Schema.Config("DB_NAME", Schema.String)
      const password = yield* Schema.Config("DB_PASSWORD", Schema.Redacted(Schema.String))

      return DatabaseConfig.of({ host, port, database, password })
    })
  )
}