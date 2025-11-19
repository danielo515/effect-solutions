import { ReferenceFooter } from "@/components/ReferenceFooter";
import { ReferenceHeader } from "@/components/ReferenceHeader";
import { getAllReferences } from "@/lib/mdx";

interface ReferencesLayoutProps {
  children: React.ReactNode;
}

export default function ReferencesLayout({ children }: ReferencesLayoutProps) {
  const references = getAllReferences();
  const referenceTitles = Object.fromEntries(
    references.map((ref) => [ref.slug, ref.title]),
  );

  return (
    <div className="min-h-screen flex flex-col">
      <ReferenceHeader referenceTitles={referenceTitles} />
      {children}
      <ReferenceFooter />
    </div>
  );
}
