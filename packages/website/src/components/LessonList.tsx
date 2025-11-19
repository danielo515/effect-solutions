"use client";

import Link from "next/link";
import { type FocusEvent, useCallback } from "react";
import { env } from "@/lib/env";
import { useLessonSfxHandlers } from "@/lib/useLessonNavSfx";

interface LessonListProps {
  lessons: Array<{
    slug: string;
    title: string;
    description?: string;
    draft?: boolean;
  }>;
}

export function LessonList({ lessons }: LessonListProps) {
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
      {lessons.map((lesson) => (
        <div key={lesson.slug}>
          <Link
            href={`/lessons/${lesson.slug}`}
            className="block px-6 py-8 hover:bg-neutral-900/50 cursor-default"
            onClick={handleClick}
            onFocus={handleFocus}
            onMouseEnter={handleMouseEnter}
          >
            <article>
              <div className="flex items-center gap-3">
                <h2 className="text-[1.05rem] font-semibold uppercase leading-snug text-neutral-100">
                  {lesson.title}
                </h2>
                {lesson.draft && !env.isProduction && (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded">
                    DRAFT
                  </span>
                )}
              </div>

              {lesson.description && (
                <p className="mt-3 text-[1.05rem] leading-relaxed text-neutral-300">
                  {lesson.description}
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
