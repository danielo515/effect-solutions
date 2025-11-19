"use client";

import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useFootnoteContext } from "@/lib/footnote-context";
import { cn } from "@/lib/cn";

type FootnoteDefinitionsProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function FootnoteDefinitions({
  children,
  className,
  id,
  ...props
}: FootnoteDefinitionsProps) {
  const { registerDefinition, resetDefinitions } = useFootnoteContext();
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    resetDefinitions();

    const items = Array.from(section.querySelectorAll("li"));

    items.forEach((item) => {
      const identifier = item.id
        .replace("user-content-fn-", "")
        .replace("fn-", "");

      if (!identifier) {
        return;
      }

      const clone = item.cloneNode(true) as HTMLElement;
      clone
        .querySelectorAll("a[data-footnote-backref]")
        .forEach((link) => link.remove());

      registerDefinition(identifier, clone.innerHTML.trim());
    });
  }, [resetDefinitions, registerDefinition, children]);

  return (
    <section
      ref={sectionRef}
      id={id}
      data-footnotes
      aria-hidden="true"
      className={cn("sr-only", className)}
      {...props}
    >
      {children}
    </section>
  );
}
