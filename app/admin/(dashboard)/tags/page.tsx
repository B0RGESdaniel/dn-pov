import { getTagsWithUsage } from "@/lib/db";
import { TagsManager } from "@/components/admin/tags-manager";

// Admin sempre lê o banco ao vivo — nada de prerender em build time aqui.
export const dynamic = "force-dynamic";

export default async function AdminTagsPage() {
  const tags = await getTagsWithUsage();

  return (
    <div>
      <h1 className="mb-6 font-display text-xl text-foreground">Tags</h1>
      <TagsManager tags={tags} />
    </div>
  );
}
