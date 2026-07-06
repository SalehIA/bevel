"use client";

import { LANDING_SERVICES } from "@/lib/landing/services";
import { LANDING_CONTAINER } from "@/lib/landing/layout";
import ScrollReveal from "./ScrollReveal";

export default function ServicesSection() {
  return (
    <section id="services" data-header-theme="onLight" className="bg-surface py-24 lg:py-32">
      <div className={LANDING_CONTAINER}>
        <ScrollReveal>
          <p className="text-xs tracking-[0.35em] text-accent uppercase">خدماتنا</p>
          <h2 className="mt-4 max-w-3xl text-4xl font-bold text-brand md:text-5xl">
            التصميم
            <br />
            يلتقي بالهدف
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
            نقدم حلول تصميم وتنفيذ متكاملة تجمع بين الخبرة المعمارية والتقنية
            المتقدمة — من الفكرة المبكرة حتى التسليم النهائي.
          </p>
        </ScrollReveal>

        <div className="mt-16 space-y-0 divide-y divide-brand/10 border-y border-brand/10">
          {LANDING_SERVICES.map((service, index) => (
            <ScrollReveal key={service.id} delay={index * 80}>
              <article className="group grid gap-4 py-10 md:grid-cols-[80px_1fr_auto] md:items-start md:gap-8 lg:py-14">
                <span className="text-sm font-medium text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-2xl font-bold text-brand transition group-hover:text-brand-dark md:text-3xl">
                    {service.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted md:text-base">
                    {service.description}
                  </p>
                </div>
                <a
                  href="#register"
                  className="self-start text-sm font-medium text-brand underline-offset-4 transition hover:text-accent hover:underline"
                >
                  اعرف المزيد
                </a>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
