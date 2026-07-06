"use client";

import ScrollReveal from "./ScrollReveal";
import { LANDING_CONTAINER } from "@/lib/landing/layout";

type Props = {
  children: React.ReactNode;
};

export default function ContactIntro({ children }: Props) {
  return (
    <section id="register" data-header-theme="onDark" className="bg-brand-dark py-24 lg:py-32">
      <div className={`${LANDING_CONTAINER} grid gap-12 lg:grid-cols-2 lg:items-start`}>
        <ScrollReveal>
          <p className="text-xs tracking-[0.35em] text-accent uppercase">تواصل</p>
          <h2 className="mt-6 text-4xl leading-tight font-bold md:text-5xl">
            التصميم الرائع
            <br />
            يبدأ
            <br />
            <span className="text-accent">بحوار</span>
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
            سجّل بياناتك وسيتواصل معك فريق Bevel لمساعدتك في مشروعك القادم.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={150}>{children}</ScrollReveal>
      </div>
    </section>
  );
}
