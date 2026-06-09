import { api } from "../api/client.js";
import type { Category } from "../api/types.js";
import { getCache, setCache } from "../utils/cache.js";

export async function getCategoriesResource() {
  const cached = getCache<string>("resource:categories");
  if (cached) {
    return { contents: [{ uri: "jishics://services/catalog", mimeType: "application/json", text: cached }] };
  }

  const categories = await api.get<Category[]>("/categories");
  const list = Array.isArray(categories) ? categories : [];

  // 按 parentId 分组
  const parents = list.filter((c) => !c.parentId || c.parentId === c.id);
  const result = parents.map((parent) => ({
    id: parent.id,
    name: parent.name,
    icon: parent.icon,
    description: parent.description,
    sub_types: list
      .filter((c) => c.parentId === parent.id && c.id !== parent.id)
      .map((c) => ({ name: c.name, icon: c.icon, description: c.description })),
  }));

  const text = JSON.stringify({ categories: result }, null, 2);
  setCache("resource:categories", text, 60 * 60_000); // 1小时

  return { contents: [{ uri: "jishics://services/catalog", mimeType: "application/json", text }] };
}
