"use client";

import type { RefObject } from "react";
import { useCallback, useEffect } from "react";

const charWidthCache = new WeakMap<HTMLElement, number>();

function measureCharWidth(line: HTMLElement): number {
  const cached = charWidthCache.get(line);
  if (cached) return cached;

  const probe = document.createElement("span");
  probe.textContent = "0";
  probe.style.visibility = "hidden";
  probe.style.position = "absolute";
  probe.style.pointerEvents = "none";
  probe.style.whiteSpace = "pre";
  probe.style.left = "0";
  probe.style.top = "0";

  line.appendChild(probe);
  const width = probe.getBoundingClientRect().width || 0;
  probe.remove();

  if (width > 0) {
    charWidthCache.set(line, width);
  }

  return width;
}

export function useCodeCalloutAlignment<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  deps: ReadonlyArray<unknown> = [],
) {
  const align = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const callouts = container.querySelectorAll<HTMLElement>(
      ".callout-message[data-callout-id]",
    );

    for (const callout of callouts) {
      const calloutId = callout.dataset.calloutId;
      if (!calloutId) continue;

      const escapedId =
        typeof CSS !== "undefined" && typeof CSS.escape === "function"
          ? CSS.escape(calloutId)
          : calloutId;

      const line = callout.closest<HTMLElement>(".line");
      if (!line) continue;

      const calloutRect = callout.getBoundingClientRect();
      if (calloutRect.width === 0) continue;

      const anchorNodes = line.querySelectorAll<HTMLElement>(
        `.callout[data-callout-id="${escapedId}"]`,
      );

      let centerX: number | undefined;

      if (anchorNodes.length > 0) {
        let left = Number.POSITIVE_INFINITY;
        let right = Number.NEGATIVE_INFINITY;

        anchorNodes.forEach((node) => {
          const rect = node.getBoundingClientRect();
          left = Math.min(left, rect.left);
          right = Math.max(right, rect.right);
        });

        if (
          left !== Number.POSITIVE_INFINITY &&
          right !== Number.NEGATIVE_INFINITY
        ) {
          centerX = left + (right - left) / 2;
        }
      } else {
        const fallbackColumn = Number.parseFloat(
          callout.dataset.fallbackColumn ?? "0",
        );

        if (Number.isFinite(fallbackColumn)) {
          const lineRect = line.getBoundingClientRect();
          const charWidth = measureCharWidth(line);
          if (charWidth > 0) {
            centerX = lineRect.left + fallbackColumn * charWidth;
          }
        }
      }

      if (centerX == null) continue;

      const offset = centerX - calloutRect.left;
      callout.style.setProperty("--callout-anchor-px", `${offset}px`);
    }
  }, [containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame: number | undefined;
    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        align();
      });
    };

    schedule();

    if (typeof document !== "undefined" && "fonts" in document) {
      // Align again after variable fonts finish loading
      (document as any).fonts?.ready?.then(schedule).catch(() => {
        // ignore font load failures
      });
    }

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : undefined;
    resizeObserver?.observe(container);

    container.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      container.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [align, containerRef, ...deps]);
}
