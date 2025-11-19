"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { transformerAnnotations } from "@/lib/shiki-transformer-annotations";
import { CalloutAlignedHtml } from "./CalloutAlignedHtml";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({
  code,
  language = "typescript",
  className,
}: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");

  useEffect(() => {
    async function highlight() {
      const result = await codeToHtml(code.trim(), {
        lang: language,
        theme: "github-dark-default",
        transformers: [transformerAnnotations()],
      });
      const sanitizedHtml = result
        .replace(/background-color:[^;"]*;?/gi, "") // drop inline backgrounds so theme controls it
        .replace(/\s*tabindex="[^"]*"/gi, ""); // prevent focus rings on generated pre elements
      setHtml(sanitizedHtml);
    }
    highlight();
  }, [code, language]);

  if (!html) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div className={`overflow-x-auto ${className || ""}`}>
      <CalloutAlignedHtml html={html} />
    </div>
  );
}
