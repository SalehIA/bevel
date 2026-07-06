import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { LOGO_CLASS, LOGO_SRC } from "@/lib/branding";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { listProjectsForCustomer } from "@/lib/customer-projects";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    redirect("/?register=1");
  }

  const projects = listProjectsForCustomer(customer.id);

  return (
    <main className="min-h-dvh bg-surface">
      <header className="border-b border-brand/10 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/">
            <Image
              src={LOGO_SRC}
              alt="Bevel"
              width={100}
              height={50}
              className={LOGO_CLASS.header}
            />
          </Link>
          <Link href="/" className="text-sm text-muted transition hover:text-brand">
            ← الصفحة الرئيسية
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-3xl font-bold text-brand">مرحباً، {customer.name}</h1>
        <p className="mt-2 text-muted">
          أضف مشروعك للحصول على المساعدة من فريق Bevel
        </p>

        <DashboardClient initialProjects={projects} />
      </div>
    </main>
  );
}
