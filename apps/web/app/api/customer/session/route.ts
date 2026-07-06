import { NextResponse } from "next/server";
import { clearCustomerSession, getCurrentCustomer } from "@/lib/customer-auth";

export async function GET() {
  const customer = await getCurrentCustomer();
  return NextResponse.json({ authenticated: Boolean(customer), customer });
}

export async function DELETE() {
  await clearCustomerSession();
  return NextResponse.json({ ok: true });
}
