"use client";

import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";

type Props = { href: string };

export default function LocationLinkButton({ href }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-brand-dark transition hover:opacity-90"
    >
      <LocationOnOutlinedIcon sx={{ fontSize: 20 }} />
      عرض الموقع على الخريطة
    </a>
  );
}
