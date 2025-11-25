"use client";

import { Args, Command, Options } from "@effect/cli";
import {
  FileSystem,
  type FileSystem as FileSystemType,
} from "@effect/platform/FileSystem";
import {
  Path,
  type Path as PathType,
  TypeId as PathTypeId,
} from "@effect/platform/Path";
import {
  type Terminal,
  Terminal as TerminalTag,
} from "@effect/platform/Terminal";
import {
  Array as Arr,
  Cause,
  Console,
  Context,
  Effect,
  Exit,
  Layer,
  Option,
  Ref,
  Schema,
} from "effect";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

// =============================================================================
// Task Schema & Domain
// =============================================================================

const TaskId = Schema.Number.pipe(Schema.brand("TaskId"));
type TaskId = typeof TaskId.Type;

class Task extends Schema.Class<Task>("Task")({
  id: TaskId,
  text: Schema.NonEmptyString,
  done: Schema.Boolean,
}) {
  toggle() {
    return new Task({ ...this, done: !this.done });
  }
}

class TaskList extends Schema.Class<TaskList>("TaskList")({
  tasks: Schema.Array(Task),
}) {
  static Json = Schema.parseJson(TaskList);
  static empty = new TaskList({ tasks: [] });

  get nextId(): TaskId {
    if (this.tasks.length === 0) return TaskId.make(1);
    return TaskId.make(Math.max(...this.tasks.map((t) => t.id)) + 1);
  }

  add(text: string): [TaskList, Task] {
    const task = new Task({ id: this.nextId, text, done: false });
    return [new TaskList({ tasks: [...this.tasks, task] }), task];
  }

  toggle(id: TaskId): [TaskList, Option.Option<Task>] {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return [this, Option.none()];

    // biome-ignore lint/style/noNonNullAssertion: index check above
    const updated = this.tasks[index]!.toggle();
    const tasks = Arr.modify(this.tasks, index, () => updated);
    return [new TaskList({ tasks }), Option.some(updated)];
  }
}

// =============================================================================
// TaskRepo Service
// =============================================================================

class TaskRepo extends Context.Tag("TaskRepo")<
  TaskRepo,
  {
    readonly list: (all?: boolean) => Effect.Effect<ReadonlyArray<Task>>;
    readonly add: (text: string) => Effect.Effect<Task>;
    readonly toggle: (id: TaskId) => Effect.Effect<Option.Option<Task>>;
    readonly clear: () => Effect.Effect<void>;
  }
>() {}

// =============================================================================
// Browser TaskRepo (localStorage)
// =============================================================================

const STORAGE_KEY = "effect-solutions-tasks-demo";
const INITIALIZED_KEY = "effect-solutions-tasks-initialized";

const DEFAULT_TASKS = new TaskList({
  tasks: [
    new Task({
      id: TaskId.make(1),
      text: "Run the agent-guided setup",
      done: false,
    }),
    new Task({ id: TaskId.make(2), text: "Become effect-pilled", done: false }),
  ],
});

function loadTaskList(): TaskList {
  if (typeof window === "undefined") return DEFAULT_TASKS;
  try {
    if (!localStorage.getItem(INITIALIZED_KEY)) {
      localStorage.setItem(INITIALIZED_KEY, "true");
      const json = JSON.stringify({ tasks: DEFAULT_TASKS.tasks });
      localStorage.setItem(STORAGE_KEY, json);
      return DEFAULT_TASKS;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return TaskList.empty;
    const parsed = Schema.decodeUnknownSync(TaskList.Json)(stored);
    return parsed;
  } catch {
    return TaskList.empty;
  }
}

function saveTaskList(list: TaskList): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify({ tasks: list.tasks });
  localStorage.setItem(STORAGE_KEY, json);
}

const BrowserTaskRepo = Layer.succeed(TaskRepo, {
  list: (all) =>
    Effect.sync(() => {
      const taskList = loadTaskList();
      return all ? taskList.tasks : taskList.tasks.filter((t) => !t.done);
    }),
  add: (text) =>
    Effect.sync(() => {
      const list = loadTaskList();
      const [newList, task] = list.add(text);
      saveTaskList(newList);
      return task;
    }),
  toggle: (id) =>
    Effect.sync(() => {
      const list = loadTaskList();
      const [newList, task] = list.toggle(id);
      saveTaskList(newList);
      return task;
    }),
  clear: () =>
    Effect.sync(() => {
      saveTaskList(TaskList.empty);
    }),
});

// =============================================================================
// Mock Console (captures output) - based on Effect's test services
// =============================================================================

interface MockConsole extends Console.Console {
  readonly getLines: () => Effect.Effect<ReadonlyArray<string>>;
}

const MockConsoleTag = Context.GenericTag<Console.Console, MockConsole>(
  "effect/Console",
);

const makeConsoleMock = Effect.gen(function* () {
  const lines = yield* Ref.make<string[]>([]);

  const getLines: MockConsole["getLines"] = () => Ref.get(lines);

  const log: MockConsole["log"] = (...args) =>
    Ref.update(lines, (l) => [...l, ...args.map(String)]);

  return {
    console: MockConsoleTag.of({
      [Console.TypeId]: Console.TypeId,
      getLines,
      log,
      unsafe: globalThis.console,
      assert: () => Effect.void,
      clear: Effect.void,
      count: () => Effect.void,
      countReset: () => Effect.void,
      debug: () => Effect.void,
      dir: () => Effect.void,
      dirxml: () => Effect.void,
      error: log, // Also capture errors
      group: () => Effect.void,
      groupEnd: Effect.void,
      info: () => Effect.void,
      table: () => Effect.void,
      time: () => Effect.void,
      timeEnd: () => Effect.void,
      timeLog: () => Effect.void,
      trace: () => Effect.void,
      warn: () => Effect.void,
    }),
    getLines,
  };
});

// =============================================================================
// Mock Platform Services (minimal browser stubs)
// =============================================================================

const MockTerminal = Layer.succeed(TerminalTag, {
  columns: Effect.succeed(80),
  readInput: Effect.die("Terminal.readInput not supported in browser"),
  readLine: Effect.die("Terminal.readLine not supported in browser"),
  display: (text: string) => Console.log(text),
} as Terminal);

// Stub FileSystem - CLI framework requires it but we don't use file operations
const notSupported = (name: string) => () =>
  Effect.die(`FileSystem.${name} not supported in browser`);

const MockFileSystem = Layer.succeed(FileSystem, {
  access: notSupported("access"),
  copy: notSupported("copy"),
  copyFile: notSupported("copyFile"),
  chmod: notSupported("chmod"),
  chown: notSupported("chown"),
  exists: notSupported("exists"),
  link: notSupported("link"),
  makeDirectory: notSupported("makeDirectory"),
  makeTempDirectory: notSupported("makeTempDirectory"),
  makeTempDirectoryScoped: notSupported("makeTempDirectoryScoped"),
  makeTempFile: notSupported("makeTempFile"),
  makeTempFileScoped: notSupported("makeTempFileScoped"),
  open: notSupported("open"),
  readDirectory: notSupported("readDirectory"),
  readFile: notSupported("readFile"),
  readFileString: notSupported("readFileString"),
  readLink: notSupported("readLink"),
  realPath: notSupported("realPath"),
  remove: notSupported("remove"),
  rename: notSupported("rename"),
  sink: notSupported("sink"),
  stat: notSupported("stat"),
  stream: notSupported("stream"),
  symlink: notSupported("symlink"),
  truncate: notSupported("truncate"),
  utimes: notSupported("utimes"),
  watch: notSupported("watch"),
  writeFile: notSupported("writeFile"),
  writeFileString: notSupported("writeFileString"),
} as FileSystemType);

// Stub Path - CLI framework requires it but we don't use path operations
const MockPath = Layer.succeed(Path, {
  [PathTypeId]: PathTypeId,
  sep: "/",
  basename: (path: string) => path.split("/").pop() ?? "",
  dirname: (path: string) => path.split("/").slice(0, -1).join("/") || "/",
  extname: (path: string) => {
    const base = path.split("/").pop() ?? "";
    const dot = base.lastIndexOf(".");
    return dot > 0 ? base.slice(dot) : "";
  },
  format: () => "",
  fromFileUrl: () => Effect.die("Path.fromFileUrl not supported in browser"),
  isAbsolute: (path: string) => path.startsWith("/"),
  join: (...paths: ReadonlyArray<string>) => paths.join("/"),
  normalize: (path: string) => path,
  parse: (path: string) => ({
    root: path.startsWith("/") ? "/" : "",
    dir: path.split("/").slice(0, -1).join("/"),
    base: path.split("/").pop() ?? "",
    ext: "",
    name: path.split("/").pop() ?? "",
  }),
  relative: (_from: string, to: string) => to,
  resolve: (...paths: ReadonlyArray<string>) => paths.join("/"),
  toFileUrl: () => Effect.die("Path.toFileUrl not supported in browser"),
  toNamespacedPath: (path: string) => path,
} satisfies PathType);

// Combined browser platform layer
const BrowserPlatform = Layer.mergeAll(MockTerminal, MockFileSystem, MockPath);

// =============================================================================
// CLI Commands
// =============================================================================

// add <task>
const textArg = Args.text({ name: "task" }).pipe(
  Args.withDescription("The task description"),
);

const addCommand = Command.make("add", { text: textArg }, ({ text }) =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo;
    const task = yield* repo.add(text);
    yield* Console.log(`Added task #${task.id}: ${task.text}`);
  }),
).pipe(Command.withDescription("Add a new task"));

// list [--all]
const allOption = Options.boolean("all").pipe(
  Options.withAlias("a"),
  Options.withDescription("Show all tasks including completed"),
);

const listCommand = Command.make("list", { all: allOption }, ({ all }) =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo;
    const tasks = yield* repo.list(all);

    if (tasks.length === 0) {
      yield* Console.log("No tasks.");
      return;
    }

    for (const task of tasks) {
      const status = task.done ? "[x]" : "[ ]";
      yield* Console.log(`${status} #${task.id} ${task.text}`);
    }
  }),
).pipe(Command.withDescription("List pending tasks"));

// toggle <id>
const idArg = Args.integer({ name: "id" }).pipe(
  Args.withDescription("The task ID to toggle"),
);

const toggleCommand = Command.make("toggle", { id: idArg }, ({ id }) =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo;
    const result = yield* repo.toggle(TaskId.make(id));

    yield* Option.match(result, {
      onNone: () => Console.log(`Task #${id} not found`),
      onSome: (task) =>
        Console.log(
          `Toggled: ${task.text} (${task.done ? "done" : "pending"})`,
        ),
    });
  }),
).pipe(Command.withDescription("Toggle a task's done status"));

// clear
const clearCommand = Command.make("clear", {}, () =>
  Effect.gen(function* () {
    const repo = yield* TaskRepo;
    yield* repo.clear();
    yield* Console.log("Cleared all tasks.");
  }),
).pipe(Command.withDescription("Clear all tasks"));

// Root command with subcommands
const app = Command.make("tasks", {}).pipe(
  Command.withDescription("A simple task manager"),
  Command.withSubcommands([
    addCommand,
    listCommand,
    toggleCommand,
    clearCommand,
  ]),
);

const cli = Command.run(app, {
  name: "tasks",
  version: "1.0.0",
});

// =============================================================================
// Run CLI in Browser
// =============================================================================

interface CliResult {
  output: string;
  isError?: boolean;
}

async function runCliCommand(args: string): Promise<CliResult> {
  // Build argv: ["node", "tasks", ...args]
  const argv = ["node", "tasks", ...parseArgs(args)];

  const program = Effect.gen(function* () {
    const { console: mockConsole, getLines } = yield* makeConsoleMock;

    // Use Console.setConsole to properly override the default console
    const consoleLayer = Console.setConsole(mockConsole);

    const exit = yield* cli(argv).pipe(
      Effect.provide(consoleLayer),
      Effect.provide(BrowserPlatform),
      Effect.provide(BrowserTaskRepo),
      Effect.exit,
    );

    const lines = yield* getLines();
    const output = lines.join("\n");

    if (Exit.isFailure(exit)) {
      // Return captured output as error, or extract error from cause
      if (output) {
        return { output, isError: true };
      }
      const maybeError = Cause.failureOption(exit.cause);
      if (Option.isSome(maybeError)) {
        return { output: String(maybeError.value), isError: true };
      }
      return { output: "Unknown error", isError: true };
    }

    return { output, isError: false };
  });

  return Effect.runPromise(program);
}

function parseArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuote: string | null = null;

  for (const char of input) {
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " ") {
      if (current) {
        args.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) args.push(current);
  return args;
}

// =============================================================================
// ANSI Parser
// =============================================================================

interface AnsiSpan {
  text: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

const ANSI_COLORS: Record<number, string> = {
  30: "#1a1a1a", // black
  31: "#ef4444", // red
  32: "#22c55e", // green
  33: "#eab308", // yellow
  34: "#3b82f6", // blue
  35: "#a855f7", // magenta
  36: "#06b6d4", // cyan
  37: "#e5e5e5", // white
  90: "#737373", // bright black (gray)
  91: "#fca5a5", // bright red
  92: "#86efac", // bright green
  93: "#fde047", // bright yellow
  94: "#93c5fd", // bright blue
  95: "#d8b4fe", // bright magenta
  96: "#67e8f9", // bright cyan
  97: "#ffffff", // bright white
};

function parseAnsi(text: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes
  const regex = /\x1b\[([0-9;]*)m/g;

  let lastIndex = 0;
  let currentStyle: Omit<AnsiSpan, "text"> = {};
  let match: RegExpExecArray | null;

  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec pattern
  while ((match = regex.exec(text)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index), ...currentStyle });
    }

    // Parse the escape codes
    const codes = match[1]?.split(";").map(Number) ?? [0];
    for (const code of codes) {
      if (code === 0) {
        // Reset
        currentStyle = {};
      } else if (code === 1) {
        currentStyle.bold = true;
      } else if (code === 2) {
        currentStyle.dim = true;
      } else if (code === 3) {
        currentStyle.italic = true;
      } else if (code === 4) {
        currentStyle.underline = true;
      } else if (code === 22) {
        currentStyle.bold = false;
        currentStyle.dim = false;
      } else if (code === 23) {
        currentStyle.italic = false;
      } else if (code === 24) {
        currentStyle.underline = false;
      } else if (code >= 30 && code <= 37) {
        const c = ANSI_COLORS[code];
        if (c) currentStyle.color = c;
      } else if (code >= 90 && code <= 97) {
        const c = ANSI_COLORS[code];
        if (c) currentStyle.color = c;
      } else if (code === 39) {
        delete currentStyle.color;
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex), ...currentStyle });
  }

  return spans;
}

function AnsiText({ text }: { text: string }) {
  const spans = parseAnsi(text);

  return (
    <>
      {spans.map((span, i) => {
        const style: React.CSSProperties = {};
        if (span.bold) style.fontWeight = "bold";
        if (span.dim) style.opacity = 0.6;
        if (span.italic) style.fontStyle = "italic";
        if (span.underline) style.textDecoration = "underline";
        if (span.color) style.color = span.color;

        return Object.keys(style).length > 0 ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <span key={i} style={style}>
            {span.text}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static list
          <span key={i}>{span.text}</span>
        );
      })}
    </>
  );
}

// =============================================================================
// UI Helpers
// =============================================================================

interface HistoryEntry {
  input: string;
  output: string;
  isError?: boolean;
}

const PLACEHOLDER_HINTS = [
  'add "Buy milk"',
  "list",
  "list --all",
  "toggle 1",
  "--help",
];

const COMMANDS = ["add", "list", "toggle", "clear"];

const nbsp = (str: string) => str.replace(/ /g, "\u00A0");

function getAutocomplete(input: string, cursorAtEnd: boolean): string | null {
  if (!input || !cursorAtEnd) return null;
  const parts = input.split(" ");
  const first = parts[0];
  if (!first) return null;
  const cmd = first.toLowerCase();

  if (parts.length === 1) {
    const match = COMMANDS.find((c) => c.startsWith(cmd) && c !== cmd);
    if (match) return match.slice(cmd.length);
  }

  if (first === "list" && parts.length === 2) {
    const flag = parts[1] ?? "";
    if ("--all".startsWith(flag) && flag !== "--all") {
      return "--all".slice(flag.length);
    }
  }

  return null;
}

function findWordBoundary(
  text: string,
  pos: number,
  direction: "left" | "right",
): number {
  if (direction === "left") {
    if (pos === 0) return 0;
    let i = pos - 1;
    while (i > 0 && text[i] === " ") i--;
    while (i > 0 && text[i - 1] !== " ") i--;
    return i;
  }
  if (pos >= text.length) return text.length;
  let i = pos;
  while (i < text.length && text[i] !== " ") i++;
  while (i < text.length && text[i] === " ") i++;
  return i;
}

const blinkStyle = {
  animation: "blink 1s step-end infinite",
} as const;

// =============================================================================
// Component
// =============================================================================

export function TerminalDemo() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [input, setInput] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hintIndex, setHintIndex] = useState(0);
  const [blinkKey, setBlinkKey] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Cycle through placeholder hints
  useEffect(() => {
    const interval = setInterval(() => {
      setHintIndex((i) => (i + 1) % PLACEHOLDER_HINTS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const syncCursor = useCallback(() => {
    if (inputRef.current) {
      setCursorPos(inputRef.current.selectionStart ?? input.length);
    }
  }, [input.length]);

  const resetBlink = useCallback(() => {
    setBlinkKey((k) => k + 1);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isRunning) return;

      const fullCommand = `tasks ${input}`.trim();
      setIsRunning(true);

      try {
        const result = await runCliCommand(input);
        setHistory((h) => [...h, { input: fullCommand, ...result }]);
      } catch (err) {
        setHistory((h) => [
          ...h,
          { input: fullCommand, output: String(err), isError: true },
        ]);
      }

      if (input.trim()) {
        setCommandHistory((h) => [...h, input]);
      }
      setHistoryIndex(-1);
      setInput("");
      setCursorPos(0);
      setIsRunning(false);
      // Refocus after React re-renders with disabled=false
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [input, isRunning],
  );

  const cursorAtEnd = cursorPos >= input.length;
  const autocomplete = getAutocomplete(input, cursorAtEnd);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const inp = inputRef.current;
      if (!inp) return;

      if (e.ctrlKey && e.key === "c") {
        e.preventDefault();
        if (input) {
          setHistory((h) => [...h, { input: `tasks ${input}^C`, output: "" }]);
          setInput("");
          setCursorPos(0);
        }
        resetBlink();
        return;
      }
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        setHistory([]);
        return;
      }
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        inp.setSelectionRange(0, 0);
        setCursorPos(0);
        resetBlink();
        return;
      }
      if (e.ctrlKey && e.key === "e") {
        e.preventDefault();
        inp.setSelectionRange(input.length, input.length);
        setCursorPos(input.length);
        resetBlink();
        return;
      }
      if (e.ctrlKey && e.key === "w") {
        e.preventDefault();
        const pos = inp.selectionStart ?? input.length;
        const newPos = findWordBoundary(input, pos, "left");
        const newInput = input.slice(0, newPos) + input.slice(pos);
        setInput(newInput);
        setCursorPos(newPos);
        setTimeout(() => inp.setSelectionRange(newPos, newPos), 0);
        resetBlink();
        return;
      }
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        const pos = inp.selectionStart ?? input.length;
        const newInput = input.slice(pos);
        setInput(newInput);
        setCursorPos(0);
        setTimeout(() => inp.setSelectionRange(0, 0), 0);
        resetBlink();
        return;
      }
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        const pos = inp.selectionStart ?? input.length;
        setInput(input.slice(0, pos));
        resetBlink();
        return;
      }
      if (e.metaKey && e.key === "Backspace") {
        e.preventDefault();
        setInput("");
        setCursorPos(0);
        resetBlink();
        return;
      }
      if (e.altKey && e.key === "Backspace") {
        e.preventDefault();
        const pos = inp.selectionStart ?? input.length;
        const newPos = findWordBoundary(input, pos, "left");
        const newInput = input.slice(0, newPos) + input.slice(pos);
        setInput(newInput);
        setCursorPos(newPos);
        setTimeout(() => inp.setSelectionRange(newPos, newPos), 0);
        resetBlink();
        return;
      }
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        const pos = inp.selectionStart ?? 0;
        const newPos = findWordBoundary(input, pos, "left");
        inp.setSelectionRange(newPos, newPos);
        setCursorPos(newPos);
        resetBlink();
        return;
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        const pos = inp.selectionStart ?? input.length;
        const newPos = findWordBoundary(input, pos, "right");
        inp.setSelectionRange(newPos, newPos);
        setCursorPos(newPos);
        resetBlink();
        return;
      }
      if (e.metaKey && e.key === "ArrowLeft") {
        e.preventDefault();
        inp.setSelectionRange(0, 0);
        setCursorPos(0);
        resetBlink();
        return;
      }
      if (e.metaKey && e.key === "ArrowRight") {
        e.preventDefault();
        inp.setSelectionRange(input.length, input.length);
        setCursorPos(input.length);
        resetBlink();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (autocomplete) {
          const newInput = input + autocomplete;
          setInput(newInput);
          setCursorPos(newInput.length);
          setTimeout(
            () => inp.setSelectionRange(newInput.length, newInput.length),
            0,
          );
        }
        resetBlink();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          const cmd =
            commandHistory[commandHistory.length - 1 - newIndex] ?? "";
          setInput(cmd);
          setCursorPos(cmd.length);
          setTimeout(() => inp.setSelectionRange(cmd.length, cmd.length), 0);
        }
        resetBlink();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const newIndex = historyIndex - 1;
        if (newIndex >= 0) {
          setHistoryIndex(newIndex);
          const cmd =
            commandHistory[commandHistory.length - 1 - newIndex] ?? "";
          setInput(cmd);
          setCursorPos(cmd.length);
          setTimeout(() => inp.setSelectionRange(cmd.length, cmd.length), 0);
        } else {
          setHistoryIndex(-1);
          setInput("");
          setCursorPos(0);
        }
        resetBlink();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        resetBlink();
        setTimeout(syncCursor, 0);
        return;
      }
      resetBlink();
    },
    [historyIndex, commandHistory, input, autocomplete, syncCursor, resetBlink],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInput(e.target.value);
      syncCursor();
    },
    [syncCursor],
  );

  const handleInputClick = useCallback(() => {
    syncCursor();
    setBlinkKey((k) => k + 1);
  }, [syncCursor]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on history change
  useEffect(() => {
    requestAnimationFrame(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    });
  }, [history]);

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(INITIALIZED_KEY);
  }, []);

  const beforeCursor = input.slice(0, cursorPos);
  const afterCursor = input.slice(cursorPos);

  return (
    <>
      <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: focus delegation */}
      <div
        className="not-prose my-6 border-y border-neutral-800 bg-neutral-950 font-mono text-sm"
        onClick={handleContainerClick}
        onKeyDown={undefined}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="text-neutral-500">Task Manager</span>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Reset
          </button>
        </div>

        <div ref={outputRef} className="h-72 overflow-y-auto">
          {history.map((entry, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only list
            <div key={i}>
              {i > 0 && <div className="border-t border-neutral-800/50" />}
              <div className="px-4 py-3">
                <div className="text-green-500">{entry.input}</div>
                {entry.output && (
                  <div
                    className={`whitespace-pre-wrap mt-1 ${entry.isError ? "text-red-400" : "text-neutral-400"}`}
                  >
                    <AnsiText text={entry.output} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {history.length > 0 && (
            <div className="border-t border-neutral-800/50" />
          )}

          <form onSubmit={handleSubmit} className="relative px-4 py-3">
            <div className="flex items-center">
              <span className="text-neutral-500">tasks&nbsp;</span>
              {input ? (
                <span className="relative">
                  <span className="text-green-500">{nbsp(beforeCursor)}</span>
                  {isFocused && (
                    <span
                      key={blinkKey}
                      className="absolute top-0 bottom-0 w-0.5 bg-green-500"
                      style={blinkStyle}
                    />
                  )}
                  <span className="text-green-500">{nbsp(afterCursor)}</span>
                  {cursorAtEnd && (
                    <span className="text-neutral-600">{autocomplete}</span>
                  )}
                </span>
              ) : (
                <span className="relative">
                  {isFocused && (
                    <span
                      key={blinkKey}
                      className="absolute top-0 bottom-0 left-0 w-0.5 bg-green-500"
                      style={blinkStyle}
                    />
                  )}
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={hintIndex}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 4 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="text-neutral-600 whitespace-nowrap pointer-events-none"
                    >
                      {PLACEHOLDER_HINTS[hintIndex]}
                    </motion.span>
                  </AnimatePresence>
                </span>
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onClick={handleInputClick}
              onSelect={syncCursor}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="absolute inset-0 opacity-0 w-full cursor-text"
              autoComplete="off"
              spellCheck={false}
              disabled={isRunning}
            />
          </form>
        </div>
      </div>
    </>
  );
}
