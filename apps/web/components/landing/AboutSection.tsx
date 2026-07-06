"use client";

import { useRef } from "react";
import ParallaxImage from "./ParallaxImage";
import ScrollReveal from "./ScrollReveal";

const ABOUT_IMAGE = "/assets/2ndDivision2.png";
const ABOUT_IMAGE_WIDTH = 1536;
const ABOUT_IMAGE_HEIGHT = 1024;

/** Desktop photo inset — inner edge pinned toward viewport center on lg+ */
const DESKTOP_IMAGE_INSET =
  "absolute top-28 right-4 bottom-28 left-4 sm:left-6 lg:right-0 lg:left-10 xl:left-14";

export default function AboutSection() {
  const aboutSectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={aboutSectionRef}
      id="about"
      data-header-theme="onLight"
      className="overflow-hidden bg-surface font-sans lg:min-h-dvh"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-dvh">
        {/* Intro text */}
        <ScrollReveal className="order-1 px-4 pt-20 pb-6 sm:px-6 lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:justify-center lg:px-10 lg:pt-28 lg:pb-8 xl:px-14">
          <h2 className="max-w-2xl pt-[1.85em] text-justify indent-8 text-base leading-[1.85] font-light text-black sm:text-lg md:text-xl lg:text-xl xl:text-2xl">
            انطلقت <span className="font-bold">بيفل Bevel</span> من رؤية هندسية تبحث عن ما هو أبعد من
            التنفيذ التقليدي؛ رؤية تجمع بين عينٍ تصميمية تعرف كيف تلتقط التفاصيل، وخبرةٍ
            ميدانية تصنع منها واقعًا محسوبًا. منذ بدايتنا، كوّنا عالمًا من المواد، الحلول،
            والخيارات التي تُصنع يدويًا مع شبكة من الورش والفنيين الذين يفهمون معنى
            الجودة. مشاريعنا تُبنى كما تُبنى الأفكار الدقيقة: باختيار واعٍ، وتنفيذ متقن،
            وشغفٍ لا يظهر في الكلام بقدر ما يظهر في النتيجة. خلال فترة وجيزة، أصبحت{" "}
            <span className="font-bold">Bevel</span> علامة تُعرف بموثوقيتها، وبأسلوبها الخاص في
            تحويل المساحات إلى تجارب تُشبه أصحابها.
          </h2>
        </ScrollReveal>

        {/* Photo — squared between texts on mobile; sticky full-height on desktop */}
        <div className="order-2 px-4 sm:px-6 lg:sticky lg:top-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-dvh lg:px-0">
          <div className="relative mx-auto aspect-square w-full overflow-hidden lg:hidden">
            <ParallaxImage
              src={ABOUT_IMAGE}
              alt="مساحات Bevel المعمارية"
              width={ABOUT_IMAGE_WIDTH}
              height={ABOUT_IMAGE_HEIGHT}
              scopeRef={aboutSectionRef}
            />
          </div>
          <div className={`${DESKTOP_IMAGE_INSET} hidden overflow-hidden lg:block`}>
            <ParallaxImage
              src={ABOUT_IMAGE}
              alt="مساحات Bevel المعمارية"
              width={ABOUT_IMAGE_WIDTH}
              height={ABOUT_IMAGE_HEIGHT}
              scopeRef={aboutSectionRef}
            />
          </div>
        </div>

        {/* Secondary text */}
        <ScrollReveal
          delay={150}
          className="order-3 px-4 pb-20 sm:px-6 lg:col-start-1 lg:row-start-2 lg:flex lg:flex-col lg:justify-end lg:px-10 lg:pb-28 xl:px-14"
        >
          <p className="max-w-md text-base leading-relaxed text-muted md:text-lg lg:ms-20 xl:ms-24">
            نقترب من كل مشروع في Bevel بعينٍ فنية وعقلٍ هندسي. نستخدم أدوات رقمية في
            التخطيط، ونستند إلى خبرة ميدانية في التنفيذ، لنصنع مساحات تجمع بين الجمال
            والوظيفة. كل خطوة محسوبة، وكل قرار مبني على فهمٍ دقيق لطبيعة المكان.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
