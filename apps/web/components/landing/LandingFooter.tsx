import Link from "next/link";
import BevelLogo from "./BevelLogo";
import { LANDING_CONTAINER } from "@/lib/landing/layout";

export default function LandingFooter() {
  return (
    <footer data-header-theme="onDark" className="bg-brand text-white">
      <div className={`border-b border-white/10 py-20 ${LANDING_CONTAINER}`}>
        <p className="text-xs tracking-[0.35em] text-accent uppercase">فريقنا</p>
        <p className="mt-4 max-w-3xl text-3xl font-bold md:text-4xl">
          قوتنا الحقيقية — الإبداع، التعاون، والابتكار
        </p>
        <p className="mt-4 max-w-xl text-sm text-white/60">
          استوديو تصميم وتنفيذ يضع التقنية أولاً — يعيد تعريف السرعة والدقة
          والتنفيذ.
        </p>
      </div>

      <div className={`flex flex-col gap-10 py-12 md:flex-row md:items-start md:justify-between ${LANDING_CONTAINER}`}>
        <BevelLogo variant="onDark" blend={false} />

        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-xs tracking-[0.15em] text-white/70 uppercase">
          <a href="#about" className="transition hover:text-white">
            من نحن
          </a>
          <a href="#projects" className="transition hover:text-white">
            المشاريع
          </a>
          <a href="#services" className="transition hover:text-white">
            الخدمات
          </a>
          <Link href="/portfolio" className="transition hover:text-white">
            المعرض
          </Link>
          <a href="#register" className="transition hover:text-white">
            تواصل
          </a>
        </nav>
      </div>

      <p className={`border-t border-white/10 py-6 text-center text-xs text-white/40 ${LANDING_CONTAINER}`}>
        © {new Date().getFullYear()} Bevel. جميع الحقوق محفوظة.
      </p>
    </footer>
  );
}
