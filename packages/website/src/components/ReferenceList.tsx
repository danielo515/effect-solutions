"use client";

import Link from "next/link";
import { type FocusEvent, useCallback } from "react";
import { useLessonSfxHandlers } from "@/lib/useLessonNavSfx";

interface ReferenceListProps {
  references: Array<{
    slug: string;
    title: string;
    description?: string;
  }>;
}

export function ReferenceList({ references }: ReferenceListProps) {
  const {
    handleHover: playHoverSfx,
    handleClick: playClickSfx,
    handleFocusVisible,
  } = useLessonSfxHandlers();

  const handleMouseEnter = useCallback(() => {
    playHoverSfx();
  }, [playHoverSfx]);

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLAnchorElement>) => {
      if (event.currentTarget.matches(":focus-visible")) {
        handleFocusVisible();
      }
    },
    [handleFocusVisible],
  );

  const handleClick = useCallback(() => {
    playClickSfx();
  }, [playClickSfx]);

  return (
    <section>
      {references.map((reference) => (
        <div key={reference.slug}>
          <Link
            href={`/references/${reference.slug}`}
            className="block px-6 py-8 hover:bg-neutral-900/50 cursor-default"
            onClick={handleClick}
            onFocus={handleFocus}
            onMouseEnter={handleMouseEnter}
          >
            <article>
              <div className="flex items-center gap-3">
                <h2 className="text-[1.05rem] font-semibold uppercase leading-snug text-neutral-100">
                  {reference.title}
                </h2>
              </div>

              {reference.description && (
                <p className="mt-3 text-[1.05rem] leading-relaxed text-neutral-300">
                  {reference.description}
                </p>
              )}
            </article>
          </Link>
          <hr className="border-t border-neutral-800" />
        </div>
      ))}
    </section>
  );
}
