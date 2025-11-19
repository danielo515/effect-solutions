"use client";

import { Effect } from "effect";
import { useState } from "react";
import { EffectNode } from "@/components/effect/EffectNode";
import { HeaderView } from "@/components/HeaderView";
import { visualEffect } from "@/lib/VisualEffect";

interface VisualEffectRunnerProps {
  name: string;
  description: string;
  showTimer?: boolean;
}

export function VisualEffectRunner({
  name,
  description,
  showTimer = true,
}: VisualEffectRunnerProps) {
  // Create a simple visual effect that succeeds after 1 second
  const [effect] = useState(() =>
    visualEffect(
      "Simple Task",
      Effect.gen(function* () {
        yield* Effect.sleep("1 second");
        return "Success!";
      }),
      showTimer,
    ),
  );

  return (
    <>
      <HeaderView
        effect={effect}
        name={name}
        description={description}
        className="px-6 py-6 border-b border-neutral-800"
      />
      <EffectNode effect={effect} className="px-6 pt-6 pb-5" />
    </>
  );
}
