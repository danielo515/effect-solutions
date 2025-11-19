"use client";

import { useRef } from "react";
import { useCodeCalloutAlignment } from "@/lib/useCodeCalloutAlignment";

interface CalloutAlignedHtmlProps {
  html: string;
  className?: string;
}

export function CalloutAlignedHtml({
  html,
  className,
}: CalloutAlignedHtmlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useCodeCalloutAlignment(containerRef, [html]);

  return (
    <div
      ref={containerRef}
      className={className}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized HTML produced by Shiki
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
