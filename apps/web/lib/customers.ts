import type { Customer } from "@bevel/shared";
import { readJson, writeJson } from "./storage";

type CustomersStore = { customers: Customer[] };

function emptyStore(): CustomersStore {
  return { customers: [] };
}

export function loadCustomers(): CustomersStore {
  return readJson("customers.json", emptyStore());
}

export function saveCustomers(store: CustomersStore) {
  writeJson("customers.json", store);
}

export function findCustomerByPhone(phone: string): Customer | undefined {
  return loadCustomers().customers.find((c) => c.phone === phone);
}

export function findCustomerById(id: string): Customer | undefined {
  return loadCustomers().customers.find((c) => c.id === id);
}

export function upsertCustomer(data: { id?: string; name: string; phone: string }): Customer {
  const store = loadCustomers();
  const now = new Date().toISOString();
  const existing = store.customers.find((c) => c.phone === data.phone);

  if (existing) {
    existing.name = data.name.trim();
    if (!existing.verifiedAt) existing.verifiedAt = now;
    saveCustomers(store);
    return existing;
  }

  const customer: Customer = {
    id: data.id || crypto.randomUUID(),
    name: data.name.trim(),
    phone: data.phone,
    verifiedAt: now,
    createdAt: now,
  };
  store.customers.push(customer);
  saveCustomers(store);
  return customer;
}
