import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { FootnoteSidebar } from "@/components/FootnoteSidebar";
import { FootnoteArticleShell } from "@/components/mdx/FootnoteArticleShell";
import { dimensions } from "@/constants/dimensions";
import { SITE_DEPLOYMENT_URL } from "@/constants/urls";
import { FootnoteProvider } from "@/lib/footnote-context";
import { getAllReferenceSlugs, getReferenceBySlug } from "@/lib/mdx";
import { useMDXComponents } from "@/mdx-components";

interface ReferencePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllReferenceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ReferencePageProps): Promise<Metadata> {
  const { slug } = await params;
  const reference = getReferenceBySlug(slug);

  if (!reference) {
    return {
      title: "Reference Not Found - Effect Best Practices",
      description: "The requested reference could not be found",
    };
  }

  const title = `${reference.title} - Effect Best Practices`;
  const description = reference.description || reference.title;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_DEPLOYMENT_URL}/references/${slug}`,
      siteName: "Effect Best Practices",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ReferencePage({ params }: ReferencePageProps) {
  const { slug } = await params;
  const reference = getReferenceBySlug(slug);

  if (!reference) {
    notFound();
  }

  const components = useMDXComponents({});

  return (
    <main className="mx-auto max-w-screen-md border-x border-neutral-800 flex-1 w-full min-h-[calc(100vh-8rem)]">
      <FootnoteProvider>
        <div className="relative">
          <FootnoteArticleShell>
            <article className="prose prose-lg prose-invert max-w-none py-6">
              <MDXRemote
                source={reference.content}
                components={components}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm],
                  },
                }}
              />
            </article>
          </FootnoteArticleShell>

          <FootnoteSidebar
            className="absolute top-0 w-80 max-w-xs ml-6"
            style={{
              left: `calc(50% + ${dimensions.article.maxWidth} / 2 + ${dimensions.article.sidebarGap})`,
            }}
          />
        </div>
      </FootnoteProvider>
    </main>
  );
}
