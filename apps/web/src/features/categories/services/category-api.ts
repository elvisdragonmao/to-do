import { type CreateCategoryInput, type UpdateCategoryInput, categoriesResponseSchema, categorySchema } from "@em-todo/shared";

import { apiRequest } from "@/shared/services/api-client.js";

export async function getCategories(signal?: AbortSignal) {
	const data = await apiRequest("/api/categories", categoriesResponseSchema, { signal });
	return data.categories;
}

export function createCategory(input: CreateCategoryInput) {
	return apiRequest("/api/categories", categorySchema, { method: "POST", body: JSON.stringify(input) });
}

export function updateCategory(categoryId: string, input: UpdateCategoryInput) {
	return apiRequest(`/api/categories/${encodeURIComponent(categoryId)}`, categorySchema, { method: "PATCH", body: JSON.stringify(input) });
}
