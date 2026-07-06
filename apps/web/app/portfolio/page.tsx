import Image from "next/image";
import Link from "next/link";
import { LOGO_CLASS, LOGO_SRC } from "@/lib/branding";
import { readManifest } from "@/lib/manifest";
import { listSections } from "@/lib/sections";

export const dynamic = "force-dynamic";

export default function PortfolioHomePage() {
  const manifest = readManifest();
  const sections = listSections();

  return (
    <main className="min-h-dvh bg-brand text-white">
      <header className="flex items-center gap-4 px-5 py-4">
        <Link href="/" className="text-sm text-white/80">
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
        <h1 className="mb-6 text-2xl font-bold">المعرض</h1>
        <div className="grid gap-4">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/portfolio/${encodeURIComponent(section.slug)}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 transition hover:bg-white/10"
            >
              <h2 className="text-xl font-semibold">{section.name}</h2>
              {section.description ? (
                <p className="mt-2 text-sm font-normal leading-relaxed text-white/75">
                  {section.description}
                </p>
              ) : null}
              <span className="mt-2 block text-sm font-normal text-white/60">
                {manifest.categories[section.slug]?.length || 0} مشروع
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
