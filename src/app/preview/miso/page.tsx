import { notFound } from "next/navigation";

export default async function MisoPreviewPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  const { MisoPreview } = await import("@/components/preview/MisoPreview");
  return <MisoPreview />;
}
