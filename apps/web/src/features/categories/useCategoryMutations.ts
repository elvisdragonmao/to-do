import type { Category } from "@sprintly/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCategory } from "../../api.js";
import { mutationKeys, queryKeys } from "../../queries.js";
import { useToast } from "../../components/Toast.js";

export function useCategoryMutations() {
	const client = useQueryClient();
	const toast = useToast();

	const updateColor = useMutation({
		mutationKey: mutationKeys.updateCategory,
		mutationFn: ({ categoryId, color }: { categoryId: string; color: string }) => updateCategory(categoryId, { color }),
		onMutate: async ({ categoryId, color }) => {
			await client.cancelQueries({ queryKey: queryKeys.categories });
			const previous = client.getQueryData<Category[]>(queryKeys.categories);
			client.setQueryData<Category[]>(queryKeys.categories, current => current?.map(category => (category.id === categoryId ? { ...category, color } : category)));
			return { previous };
		},
		onError: (error, _variables, context) => {
			client.setQueryData(queryKeys.categories, context?.previous);
			toast.show(error instanceof Error ? error.message : "無法更新分類顏色", "error");
		},
		onSuccess: category => {
			client.setQueryData<Category[]>(queryKeys.categories, current => current?.map(item => (item.id === category.id ? category : item)));
		},
		onSettled: () => client.invalidateQueries({ queryKey: queryKeys.categories })
	});

	return { updateColor };
}
