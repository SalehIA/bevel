import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import CategoryProjects from "@/components/portfolio/CategoryProjects";
import { LOGO_CLASS, LOGO_SRC } from "@/lib/branding";
import { readManifest } from "@/lib/manifest";
import { getSectionBySlug } from "@/lib/sections";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ category: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  const manifest = readManifest();
  const projects = manifest.categories[decoded];
  const section = getSectionBySlug(decoded);

  if (!projects) notFound();

  return (
    <main className="min-h-dvh bg-brand text-white">
      <header className="flex items-center gap-4 px-5 py-4">
        <Link href="/portfolio" className="text-sm text-white/80">
          ← رجوع
        </Link>
        <Image
          src={LOGO_SRC}
          alt="Bevel"
          width={100}
          height={50}
          className={`ms-auto ${LOGO_CLASS.header}`}
        />
      </header>

      <section className="px-5 pb-10">
        <h1 className="text-2xl font-bold">{decoded}</h1>
        {section?.description ? (
          <p className="mt-2 max-w-2xl text-white/80">{section.description}</p>
        ) : null}

        <div className="mt-6">
          <Suspense fallback={<p className="text-white/60">جاري التحميل...</p>}>
            <CategoryProjects category={decoded} projects={projects} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
