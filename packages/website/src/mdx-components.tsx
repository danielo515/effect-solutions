import type { MDXComponents } from "mdx/types";
import {
  Children,
  type HTMLAttributes,
  isValidElement,
  type ReactNode,
} from "react";
import { codeToHtml } from "shiki";
import { ArrowRight, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { CalloutAlignedHtml } from "@/components/mdx/CalloutAlignedHtml";
import { FootnoteDefinitions } from "@/components/mdx/FootnoteDefinitions";
import { FootnoteReference } from "@/components/mdx/FootnoteReference";
import { MarginAside } from "@/components/mdx/MarginAside";
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

  try {
    const html = await codeToHtml(children.trim(), {
      lang: language,
      theme: "github-dark-default",
      transformers: [transformerAnnotations()],
    });
    const sanitizedHtml = html
      .replace(/background-color:[^;"]*;?/gi, "")
      .replace(/\s*tabindex="[^"]*"/gi, "");

    return (
      <div className="not-prose my-6 overflow-x-auto bg-neutral-950 border-y border-neutral-800">
        <CalloutAlignedHtml html={sanitizedHtml} />
      </div>
    );
  } catch {
    return (
      <pre className="my-6 overflow-x-auto border border-neutral-800 p-6 font-mono text-foreground">
        <code>{children}</code>
      </pre>
    );
  }
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
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
          "text-xl font-semibold leading-snug text-neutral-100 mx-6 uppercase tracking-wide",
          className,
        )}
        {...props}
      >
        {children}
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
          "space-y-3 text-[1.05rem] text-neutral-300 mx-6 list-disc list-inside mt-6",
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
    a: ({ children, className, href, ...props }) => {
      const isInternal = href?.startsWith('/references/') || href?.startsWith('./');
      const isExternal = href?.startsWith('http://') || href?.startsWith('https://');

      return (
        <a
          href={href}
          className={cn(
            "text-blue-400 hover:text-blue-300 no-underline cursor-pointer inline-flex items-center gap-1",
            className,
          )}
          {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
          {...props}
        >
          {isInternal && (
            <ArrowRight size={16} weight="bold" className="text-blue-400/60" />
          )}
          {children}
          {isExternal && (
            <ArrowSquareOut size={16} weight="bold" className="text-blue-400/60" />
          )}
        </a>
      );
    },
    MarginAside,
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
                anchorId={anchorId}
                href={href || `#fn-${footnoteId}`}
                ariaDescribedBy={ariaDescribedBy}
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

    ...components,
  };
}
