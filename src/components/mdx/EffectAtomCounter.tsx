"use client";

import { Atom, useAtom } from "@effect-atom/atom-react";
import { pipe } from "effect/Function";
import { useLessonSfxHandlers } from "@/lib/useLessonNavSfx";

const countAtom = pipe(
  Atom.make(0),
  Atom.keepAlive,
  Atom.withLabel("EffectAtomCounter"),
);

export function EffectAtomCounter() {
  const [count, setCount] = useAtom(countAtom);
  const { handleHover: playHoverSfx } = useLessonSfxHandlers();

  return (
    <div className="not-prose">
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-stone-800 bg-stone-950 shadow-lg">
        <header className="flex items-center justify-between border-b border-stone-800 px-5 py-4 text-[0.65rem] uppercase tracking-[0.45em] text-stone-500">
          <span>Counter</span>
        </header>

        <div className="flex flex-col items-center justify-center px-6 py-12">
          <span className="text-6xl font-semibold text-stone-100 sm:text-7xl">
            {count}
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-stone-800 border-t border-stone-800">
          <button
            type="button"
            onMouseEnter={playHoverSfx}
            onClick={() => setCount((c) => c - 1)}
            className="px-4 py-4 text-sm font-medium uppercase tracking-[0.35em] text-stone-300 hover:bg-stone-900 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 !select-none cursor-default"
          >
            Decrease
          </button>
          <button
            type="button"
            onMouseEnter={playHoverSfx}
            onClick={() => setCount(() => 0)}
            className="px-4 py-4 text-sm font-medium uppercase tracking-[0.35em] text-stone-300 hover:bg-stone-900 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 !select-none cursor-default"
          >
            Reset
          </button>
          <button
            type="button"
            onMouseEnter={playHoverSfx}
            onClick={() => setCount((c) => c + 1)}
            className="px-4 py-4 text-sm font-medium uppercase tracking-[0.35em] text-stone-300 hover:bg-stone-900 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-600 !select-none cursor-default"
          >
            Increase
          </button>
        </div>
      </div>
    </div>
  );
}
