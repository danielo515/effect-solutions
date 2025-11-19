"use client";

import { useRef } from "react";
import { useCodeCalloutAlignment } from "@/lib/useCodeCalloutAlignment";

interface CalloutAlignedHtmlProps {
  html: string;
  className?: string;
}

export function CalloutAlignedHtml({ html, className }: CalloutAlignedHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useCodeCalloutAlignment(containerRef, [html]);

  /* biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized HTML produced by Shiki */
  return (
    <div
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
