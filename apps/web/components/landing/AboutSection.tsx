"use client";

import { useRef } from "react";
import ParallaxImage from "./ParallaxImage";
import ScrollReveal from "./ScrollReveal";

const ABOUT_IMAGE = "/assets/2ndDivision2.png";
const ABOUT_IMAGE_WIDTH = 1536;
const ABOUT_IMAGE_HEIGHT = 1024;

/** Fixed inset around the showcase photo — matches abvtek py/px rhythm */
const IMAGE_INSET =
  "absolute top-20 right-4 bottom-20 left-4 sm:left-6 md:top-28 md:bottom-28 lg:right-0 lg:left-10 xl:left-14";

export default function AboutSection() {
  const aboutSectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={aboutSectionRef}
      id="about"
      data-header-theme="onLight"
      className="overflow-hidden bg-surface font-sans lg:min-h-dvh"
    >
      <div className="flex flex-col lg:flex-row">
        {/* Text — start side (right in RTL) */}
        <div className="flex flex-1 flex-col justify-center gap-8 px-4 py-20 sm:px-6 md:py-28 lg:w-1/2 lg:justify-between lg:px-10 lg:py-28 xl:px-14">
          <ScrollReveal>
            <h2 className="max-w-2xl text-base leading-[1.85] font-bold text-brand sm:text-lg md:text-xl lg:text-xl xl:text-2xl">
              انطلقت بيفل Bevel من رؤية هندسية تبحث عن ما هو أبعد من التنفيذ التقليدي؛
              رؤية تجمع بين عينٍ تصميمية تعرف كيف تلتقط التفاصيل، وخبرةٍ ميدانية تصنع
              منها واقعًا محسوبًا. منذ بدايتنا، كوّنا عالمًا من المواد، الحلول، والخيارات
              التي تُصنع يدويًا مع شبكة من الورش والفنيين الذين يفهمون معنى الجودة.
              مشاريعنا تُبنى كما تُبنى الأفكار الدقيقة: باختيار واعٍ، وتنفيذ متقن،
              وشغفٍ لا يظهر في الكلام بقدر ما يظهر في النتيجة. خلال فترة وجيزة، أصبحت
              Bevel علامة تُعرف بموثوقيتها، وبأسلوبها الخاص في تحويل المساحات إلى تجارب
              تُشبه أصحابها.
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <p className="max-w-md text-base leading-relaxed text-muted md:text-lg lg:ms-20 xl:ms-24">
              نقترب من كل مشروع في Bevel بعينٍ فنية وعقلٍ هندسي. نستخدم أدوات رقمية في
              التخطيط، ونستند إلى خبرة ميدانية في التنفيذ، لنصنع مساحات تجمع بين الجمال
              والوظيفة. كل خطوة محسوبة، وكل قرار مبني على فهمٍ دقيق لطبيعة المكان.
            </p>
          </ScrollReveal>
        </div>

        {/* Photo — end side (left in RTL); sticky full-height on lg while text scrolls */}
        <div className="relative min-h-[320px] flex-1 sm:min-h-[380px] lg:sticky lg:top-0 lg:h-dvh lg:w-1/2 lg:flex-none">
          <div className={`${IMAGE_INSET} overflow-hidden`}>
            <ParallaxImage
              src={ABOUT_IMAGE}
              alt="مساحات Bevel المعمارية"
              width={ABOUT_IMAGE_WIDTH}
              height={ABOUT_IMAGE_HEIGHT}
              scopeRef={aboutSectionRef}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
