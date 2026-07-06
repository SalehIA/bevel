import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { findCustomerById } from "./customers";
import {
  customerSessionOptions,
  type CustomerSessionData,
} from "./customer-session";

export async function getCustomerSession() {
  return getIronSession<CustomerSessionData>(await cookies(), customerSessionOptions);
}

export async function getCurrentCustomer() {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId) return null;
  const customer = findCustomerById(session.customerId);
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
  };
}

export async function setCustomerSession(customer: {
  id: string;
  name: string;
  phone: string;
}) {
  const session = await getCustomerSession();
  session.customerId = customer.id;
  session.name = customer.name;
  session.phone = customer.phone;
  session.isVerified = true;
  session.isLoggedIn = true;
  await session.save();
}

export async function clearCustomerSession() {
  const session = await getCustomerSession();
  session.destroy();
}
