"use client";

import { AtomFamilyCounter } from "./AtomFamilyCounter";

export function DynamicAtomFamilyCounters() {
  return (
    <div className="not-prose flex flex-col">
      {[1, 2, 3].map((id) => (
        <AtomFamilyCounter key={id} id={id} />
      ))}
    </div>
  );
}
