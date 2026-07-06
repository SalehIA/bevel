import type { CustomerProject, CustomerProjectStatus } from "@bevel/shared";
import { readJson, writeJson } from "./storage";

type ProjectsStore = { projects: CustomerProject[] };

function emptyStore(): ProjectsStore {
  return { projects: [] };
}

export function loadCustomerProjects(): ProjectsStore {
  return readJson("customer-projects.json", emptyStore());
}

export function saveCustomerProjects(store: ProjectsStore) {
  writeJson("customer-projects.json", store);
}

export function listProjectsForCustomer(customerId: string): CustomerProject[] {
  return loadCustomerProjects()
    .projects.filter((p) => p.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createCustomerProject(data: {
  customerId: string;
  title: string;
  serviceType: string;
  description?: string;
  location?: string;
}): CustomerProject {
  const store = loadCustomerProjects();
  const project: CustomerProject = {
    id: crypto.randomUUID(),
    customerId: data.customerId,
    title: data.title.trim(),
    serviceType: data.serviceType,
    description: data.description?.trim() || undefined,
    location: data.location?.trim() || undefined,
    status: "new" satisfies CustomerProjectStatus,
    createdAt: new Date().toISOString(),
  };
  store.projects.push(project);
  saveCustomerProjects(store);
  return project;
}
