import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { createCustomerProject, listProjectsForCustomer } from "@/lib/customer-projects";
import { getServiceById } from "@/lib/landing/services";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const projects = listProjectsForCustomer(customer.id);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const serviceType = String(body.serviceType || "").trim();
  const description = String(body.description || "").trim();
  const location = String(body.location || "").trim();

  if (!title || title.length < 2) {
    return NextResponse.json({ error: "عنوان المشروع مطلوب" }, { status: 400 });
  }

  if (!serviceType || !getServiceById(serviceType)) {
    return NextResponse.json({ error: "نوع الخدمة مطلوب" }, { status: 400 });
  }

  const project = createCustomerProject({
    customerId: customer.id,
    title,
    serviceType,
    description: description || undefined,
    location: location || undefined,
  });

  return NextResponse.json({ ok: true, project });
}
