export const dynamic = "force-dynamic";

import LandingPage from "@/components/landing/LandingPage";

type Props = {
  searchParams: Promise<{ register?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  return <LandingPage autoOpenRegister={params.register === "1"} />;
}
