import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectMediaTabs from "@/components/portfolio/ProjectMediaTabs";
import LocationLinkButton from "@/components/portfolio/LocationLinkButton";
import { LOGO_CLASS, LOGO_SRC } from "@/lib/branding";
import { readManifest } from "@/lib/manifest";
import { formatSaudiPhoneDisplay, formatSaudiPhoneTel } from "@/lib/phone";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ category: string; slug: string }> };

function normalizeLink(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default async function ProjectPage({ params }: Props) {
  const { category, slug } = await params;
  const decodedCategory = decodeURIComponent(category);
  const decodedSlug = decodeURIComponent(slug);
  const manifest = readManifest();
  const project = manifest.categories[decodedCategory]?.find((p) => p.slug === decodedSlug);

  if (!project) notFound();

  const locationUrl = normalizeLink(project.locationLink);
  const engineerName = project.siteEngineer?.name?.trim();
  const engineerPhone = project.siteEngineer?.phone?.trim();
  const hasDetails = Boolean(engineerName || engineerPhone || locationUrl);

  return (
    <main className="min-h-dvh bg-brand text-white">
      <header className="flex items-center gap-4 px-5 py-4">
        <Link
          href={`/portfolio/${encodeURIComponent(decodedCategory)}`}
          className="text-sm text-white/80"
        >
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

      <section className="space-y-6 px-5 pb-10">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.description ? (
            <p className="mt-2 whitespace-pre-line text-white/80">{project.description}</p>
          ) : null}
          {project.tags?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/90">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {hasDetails ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            {engineerName ? (
              <p>
                <span className="text-white/60">مهندس المشروع: </span>
                {engineerName}
              </p>
            ) : null}
            {engineerPhone ? (
              <p>
                <span className="text-white/60">الهاتف: </span>
                <a
                  href={`tel:${formatSaudiPhoneTel(engineerPhone)}`}
                  className="font-medium text-white underline decoration-accent"
                  dir="ltr"
                >
                  {formatSaudiPhoneDisplay(engineerPhone)}
                </a>
              </p>
            ) : null}
            {locationUrl ? <LocationLinkButton href={locationUrl} /> : null}
          </div>
        ) : null}

        <ProjectMediaTabs
          category={decodedCategory}
          slug={decodedSlug}
          name={project.name}
          photos={project.photos}
          videos={project.videos}
        />
      </section>
    </main>
  );
}
