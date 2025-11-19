"use client";

import { Atom, useAtom } from "@effect-atom/atom-react";
import { pipe } from "effect/Function";
import { CounterUI } from "./CounterUI";

const countAtom = pipe(
  Atom.make(0),
  Atom.keepAlive,
  Atom.withLabel("AtomCounter"),
);

export function AtomCounter() {
  const [count, setCount] = useAtom(countAtom);

  return (
    <CounterUI
      value={count}
      onDecrement={() => setCount((c) => c - 1)}
      onIncrement={() => setCount((c) => c + 1)}
    />
  );
}
