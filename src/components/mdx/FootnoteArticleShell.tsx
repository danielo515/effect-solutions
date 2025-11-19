"use client";

import { useCallback } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useFootnoteContext } from "@/lib/footnote-context";

interface FootnoteArticleShellProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function FootnoteArticleShell({
  children,
  className,
  ...props
}: FootnoteArticleShellProps) {
  const { registerArticle } = useFootnoteContext();

  const setArticleRef = useCallback(
    (element: HTMLElement | null) => {
      registerArticle(element);
    },
    [registerArticle],
  );

  return (
    <main
      ref={setArticleRef}
      className={cn(
        "mx-auto flex w-full flex-1 flex-col border-x border-neutral-800 max-w-screen-sm",
        className,
      )}
      {...props}
    >
      {children}
    </main>
  );
}
