import { getPhotos, getTags } from "@/lib/photos-source";
import { PhotoMural } from "@/components/photo-mural";

function parseList(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  return raw.split(",").filter(Boolean);
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;

  const place = parseList(params.place);
  const subject = parseList(params.subject);
  const color = parseList(params.color);

  const [initialPage, tags] = await Promise.all([
    getPhotos({ place, subject, color }),
    getTags(),
  ]);

  const filterKey = `${place?.join(",") ?? ""}|${subject?.join(",") ?? ""}|${color?.join(",") ?? ""}`;

  return (
    <PhotoMural
      key={filterKey}
      initialPhotos={initialPage.photos}
      initialCursor={initialPage.nextCursor}
      tags={tags}
      activeFilters={{ place, subject, color }}
    />
  );
}
