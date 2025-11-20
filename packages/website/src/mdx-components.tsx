import type { MDXComponents } from "mdx/types";
import {
  Children,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
} from "react";
import { codeToHtml } from "shiki";
import { AsteriskIcon, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { CodeCopyButton } from "@/components/mdx/CodeCopyButton";
import { DraftNote } from "@/components/mdx/DraftNote";
import { FootnoteDefinitions } from "@/components/mdx/FootnoteDefinitions";
import { FootnoteReference } from "@/components/mdx/FootnoteReference";
import { LLMInstructionsButton } from "@/components/mdx/LLMInstructionsButton";
import { CursorInstallButton } from "@/components/mdx/CursorInstallButton";
import { MarginAside } from "@/components/mdx/MarginAside";
import { MDXLink } from "@/components/mdx/MDXLink";
import { cn } from "@/lib/cn";
import { transformerAnnotations } from "@/lib/shiki-transformer-annotations";

type FootnoteRefElementProps = {
  id?: string;
  href?: string;
  "aria-describedby"?: string;
  children?: ReactNode;
  "data-footnote-ref"?: string | number | boolean;
};

async function CodeBlock({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  if (!className?.startsWith("language-")) {
    return (
      <span className="font-mono text-foreground/80 bg-neutral-800 px-1">
        {children}
      </span>
    );
  }

  const language = className.replace("language-", "");
  const trimmed = children.trim();

  try {
    const html = await codeToHtml(trimmed, {
      lang: language,
      theme: "github-dark-default",
      transformers: [transformerAnnotations()],
    });
    const sanitizedHtml = html
      .replace(/background-color:[^;"]*;?/gi, "")
      .replace(/\s*tabindex="[^"]*"/gi, "");

    return (
      <div className="not-prose group relative my-6 border-y border-neutral-800 bg-neutral-950">
        <CodeCopyButton value={trimmed} />
        <div
          className="overflow-x-auto"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized via Shiki and inline styles stripped
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    );
  } catch {
    return (
      <div className="not-prose group relative my-6 border border-neutral-800 bg-neutral-950">
        <CodeCopyButton value={trimmed} />
        <pre className="overflow-x-auto p-6 font-mono text-foreground">
          <code>{trimmed}</code>
        </pre>
      </div>
    );
  }
}

export function useMDXComponents(
  components: MDXComponents & { instructions?: string },
): MDXComponents {
  const { instructions, ...restComponents } = components;

  return {
    h1: ({ children, className, ...props }) => (
      <h1
        className={cn(
          "text-3xl font-semibold uppercase tracking-[0.3em] text-neutral-400 first:mt-0 mx-6",
          className,
        )}
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, className, ...props }) => (
      <h2
        className={cn(
          "text-xl font-semibold leading-snug text-neutral-100 uppercase tracking-wide flex flex-col gap-6",
          className,
        )}
        {...props}
      >
        <span
          className="w-full h-6 border-y border-[var(--color-border)] block"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 8px, var(--color-border) 8px, var(--color-border) 9px)",
          }}
        />
        <span className="flex items-center gap-3 px-6">
          <AsteriskIcon
            size={18}
            weight="bold"
            className="text-neutral-500 shrink-0"
          />
          {children}
        </span>
      </h2>
    ),
    h3: ({ children, className, ...props }) => (
      <h3
        className={cn(
          "text-lg font-semibold leading-snug text-neutral-200 mx-6",
          className,
        )}
        {...props}
      >
        {children}
      </h3>
    ),
    p: ({ children, className, ...props }) => (
      <p
        className={cn(
          "text-[1.05rem] leading-relaxed text-neutral-300 mx-6",
          className,
        )}
        {...props}
      >
        {children}
      </p>
    ),
    ul: ({ children, className, ...props }) => (
      <ul
        className={cn(
          "space-y-2 text-[1.05rem] text-neutral-300 mx-6 list-[square] list-inside marker:text-neutral-600",
          className,
        )}
        {...props}
      >
        {children}
      </ul>
    ),
    ol: ({ children, className, ...props }) => (
      <ol
        className={cn(
          "space-y-3 text-[1.05rem] text-neutral-300 mx-6 list-decimal list-inside",
          className,
        )}
        {...props}
      >
        {children}
      </ol>
    ),
    li: ({ children, className, ...props }) => (
      <li className={cn("pl-2 text-neutral-300", className)} {...props}>
        {children}
      </li>
    ),
    a: MDXLink,
    MarginAside,
    DraftNote,
    LLMInstructionsButton: instructions
      ? () => <LLMInstructionsButton instructions={instructions} />
      : LLMInstructionsButton,
    CursorInstallButton,
    code: CodeBlock,
    pre: ({ children }) => (
      <div className="not-prose text-red-500">{children}</div>
    ),
    blockquote: ({ children }) => (
      <blockquote className=" border-l border-neutral-700/70 pl-6 text-[1.1rem] italic text-neutral-200">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-t border-neutral-800 my-6" />,
    sup: ({ children }: { children: ReactNode }) => {
      const childArray = Children.toArray(children);
      if (childArray.length === 1) {
        const child = childArray[0];
        if (
          isValidElement<FootnoteRefElementProps>(child) &&
          child.props["data-footnote-ref"]
        ) {
          const anchorId =
            typeof child.props.id === "string" ? child.props.id : undefined;
          const href =
            typeof child.props.href === "string" ? child.props.href : "";
          const ariaDescribedBy =
            typeof child.props["aria-describedby"] === "string"
              ? child.props["aria-describedby"]
              : undefined;

          const deriveId = (raw?: string) => {
            if (!raw) return undefined;
            const normalized = raw
              .replace(/^#/, "")
              .replace(/^user-content-/, "");
            const match =
              normalized.match(/^fnref[:-]?(.+)$/i) ??
              normalized.match(/^fn[:-]?(.+)$/i);
            return match?.[1];
          };

          const footnoteId = deriveId(anchorId) ?? deriveId(href) ?? undefined;

          if (footnoteId) {
            return (
              <FootnoteReference
                footnoteId={footnoteId}
                {...(anchorId !== undefined ? { anchorId } : {})}
                href={href || `#fn-${footnoteId}`}
                {...(ariaDescribedBy !== undefined ? { ariaDescribedBy } : {})}
              >
                {child.props.children}
              </FootnoteReference>
            );
          }
        }
      }
      return <sup>{children}</sup>;
    },
    section: (
      props: HTMLAttributes<HTMLElement> & {
        "data-footnotes"?: boolean;
        children: ReactNode;
      },
    ) => {
      if (props["data-footnotes"] !== undefined) {
        return <FootnoteDefinitions {...props} />;
      }
      return <section {...props} />;
    },
    aside: ({ children, ...props }) => (
      <MarginAside {...props}>{children}</MarginAside>
    ),

    ...restComponents,
  };
}
