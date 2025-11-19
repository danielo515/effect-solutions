"use client";

import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { counterSounds } from "@/lib/sounds/counter-sounds";
import { useLessonSfxHandlers } from "@/lib/useLessonNavSfx";
import { NumberOdometer } from "../NumberOdometer";

interface CounterUIProps {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  title?: string;
  className?: string;
}

export function CounterUI({
  value,
  onDecrement,
  onIncrement,
  title = "Counter",
  className,
}: CounterUIProps) {
  const { handleHover: playHoverSfx } = useLessonSfxHandlers();

  return (
    <div
      className={cn(
        "not-prose flex flex-col items-center border-y border-neutral-800 bg-neutral-950",
        className,
      )}
    >
      <div className="w-full border-b border-neutral-800">
        <div className="flex items-center justify-between px-5 py-3">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-400">
            {title}
          </span>
        </div>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-3 divide-x divide-neutral-800">
          <button
            type="button"
            onMouseEnter={playHoverSfx}
            onClick={() => {
              onDecrement();
              counterSounds.playDecrement();
            }}
            className="flex items-center justify-center px-6 py-8 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 !select-none cursor-default"
            aria-label="Decrement"
          >
            <MinusIcon size={32} weight="bold" />
          </button>
          <div className="flex items-center justify-center py-0">
            <NumberOdometer
              value={value}
              className="text-6xl font-semibold text-neutral-100"
            />
          </div>
          <button
            type="button"
            onMouseEnter={playHoverSfx}
            onClick={() => {
              onIncrement();
              counterSounds.playIncrement();
            }}
            className="flex items-center justify-center px-6 py-8 text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 !select-none cursor-default"
            aria-label="Increment"
          >
            <PlusIcon size={32} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
