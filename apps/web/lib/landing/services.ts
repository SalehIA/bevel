export const LANDING_SERVICES = [
  {
    id: "architecture",
    title: "التصميم المعماري",
    description:
      "نصمم مفاهيم معمارية رؤيوية تجمع بين الوظيفة والجمال والسياق، لتشكيل مساحات تلهم وتدوم.",
  },
  {
    id: "construction",
    title: "الإنشاء وإدارة المشاريع",
    description:
      "ندير مشاريعكم من التخطيط إلى التسليم بكفاءة عالية، مع ضمان الجودة والالتزام بالجدول الزمني.",
  },
  {
    id: "interior-design",
    title: "التصميم الداخلي والتنفيذ",
    description:
      "نحول الرؤية إلى واقع من خلال تصميم داخلي متكامل وتنفيذ دقيق يعكس هوية مشروعكم.",
  },
  {
    id: "fit-out",
    title: "التشطيب الداخلي",
    description:
      "نقدم حلول تشطيب داخلي شاملة للمساحات السكنية والتجارية بأعلى معايير الجودة.",
  },
  {
    id: "workplace",
    title: "استشارات أماكن العمل",
    description:
      "نساعدكم في تصميم بيئات عمل محفزة تجمع بين الإنتاجية والراحة والهوية المؤسسية.",
  },
] as const;

export type ServiceId = (typeof LANDING_SERVICES)[number]["id"];

export function getServiceById(id: string) {
  return LANDING_SERVICES.find((s) => s.id === id);
}
