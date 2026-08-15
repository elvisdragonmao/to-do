import type { Category, UpdateCategoryInput } from "@em-todo/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/shared/components/toast/Toast.js";
import { updateCategory } from "../services/category-api.js";
import { categoryMutationKeys, categoryQueryKeys } from "../services/category-queries.js";

export function useCategoryMutations() {
	const client = useQueryClient();
	const toast = useToast();

	const update = useMutation({
		mutationKey: categoryMutationKeys.update,
		mutationFn: ({ categoryId, input }: { categoryId: string; input: UpdateCategoryInput }) => updateCategory(categoryId, input),
		onMutate: async ({ categoryId, input }) => {
			await client.cancelQueries({ queryKey: categoryQueryKeys.all });
			const previous = client.getQueryData<Category[]>(categoryQueryKeys.all);
			client.setQueryData<Category[]>(categoryQueryKeys.all, current =>
				current
					?.map(category => (category.id === categoryId ? { ...category, ...input } : category))
					.toSorted((left, right) => left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt))
			);
			return { previous };
		},
		onError: (error, _variables, context) => {
			client.setQueryData(categoryQueryKeys.all, context?.previous);
			toast.show(error instanceof Error ? error.message : "無法更新分類", "error");
		},
		onSuccess: category => {
			client.setQueryData<Category[]>(categoryQueryKeys.all, current => current?.map(item => (item.id === category.id ? category : item)));
		},
		onSettled: () => client.invalidateQueries({ queryKey: categoryQueryKeys.all })
	});

	return { update };
}
