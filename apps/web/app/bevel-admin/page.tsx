import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { bootstrapData, getCurrentUser } from "@/lib/auth";

export default async function AdminHomePage() {
  await bootstrapData();
  const user = await getCurrentUser();
  if (!user) redirect("/bevel-admin/login");
  return <AdminDashboard user={user} />;
}
