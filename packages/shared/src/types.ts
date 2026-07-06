export type Permissions = {
  tabs: string[];
  sections: string[];
  admin_tabs: string[];
};

export type PublicUser = {
  id: string;
  username: string;
  name: string;
  role_id: string;
  role_name: string;
  permissions: Permissions;
};

export type Role = {
  id: string;
  name: string;
  permissions: Permissions;
};

export type PagePhotos = Partial<Record<string, string[]>>;

export type PageOrder = Partial<Record<string, number>>;

export type Section = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export type Subsection = {
  slug: string;
  name: string;
  description?: string;
  locationLink?: string;
  siteEngineer?: { name?: string; phone?: string };
  tags?: string[];
  thumbnail?: string | null;
  mediaOrder?: string[];
  /** Page IDs where this subcategory is shown (e.g. landing). */
  visibleOnPages?: string[];
  /** Selected photo filenames per page ID. */
  photosByPage?: PagePhotos;
  /** Sort order per page ID (lower = earlier). */
  pageOrder?: PageOrder;
};

export type ProjectMedia = {
  slug: string;
  name: string;
  photos: string[];
  videos: string[];
  thumbnail: string | null;
  description?: string;
  locationLink?: string;
  siteEngineer?: { name?: string; phone?: string };
  tags?: string[];
  visibleOnPages?: string[];
  photosByPage?: PagePhotos;
  pageOrder?: PageOrder;
};

export type Manifest = {
  categories: Record<string, ProjectMedia[]>;
  generated: boolean;
  source: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  verifiedAt: string;
  createdAt: string;
};

export type CustomerProjectStatus = "new" | "in_review" | "in_progress";

export type CustomerProject = {
  id: string;
  customerId: string;
  title: string;
  serviceType: string;
  description?: string;
  location?: string;
  status: CustomerProjectStatus;
  createdAt: string;
};

export const CUSTOMER_PROJECT_STATUS_LABELS: Record<CustomerProjectStatus, string> = {
  new: "جديد",
  in_review: "قيد المراجعة",
  in_progress: "قيد التنفيذ",
};
