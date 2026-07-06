import { readManifest } from "@/lib/manifest";

export async function GET() {
  const manifest = readManifest();
  return Response.json(manifest);
}
