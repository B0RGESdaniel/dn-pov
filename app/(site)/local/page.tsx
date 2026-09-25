import { notFound, redirect } from "next/navigation";
import { getPlaces } from "@/lib/photos-source";

export default async function LocalIndexPage() {
  const places = await getPlaces();
  const first = places[0];
  if (!first) notFound();

  redirect(`/local/${encodeURIComponent(first.tag.name)}`);
}
