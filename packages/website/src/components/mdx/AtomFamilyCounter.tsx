"use client";

import { Atom, useAtom } from "@effect-atom/atom-react";
import { pipe } from "effect/Function";
import { CounterUI } from "./CounterUI";

// Create a family of counter atoms, each identified by a numeric ID
// Atom.family ensures we get a stable reference to the Atom for each key
const counterFamily = Atom.family((_id: number) =>
  pipe(Atom.make(0), Atom.keepAlive),
);

interface AtomFamilyCounterProps {
  id: number;
  className?: string;
}

export function AtomFamilyCounter({ id, className }: AtomFamilyCounterProps) {
  const [count, setCount] = useAtom(counterFamily(id));

  return (
    <CounterUI
      value={count}
      onDecrement={() => setCount((c) => c - 1)}
      onIncrement={() => setCount((c) => c + 1)}
      title={`Counter #${id}`}
      className={className}
    />
  );
}
