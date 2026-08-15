import { type Category, createCategorySchema } from "@em-todo/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { AppDialog } from "@/shared/components/app-dialog/AppDialog.js";
import { Button } from "@/shared/components/button/Button.js";
import { Field } from "@/shared/components/field/Field.js";
import { Spinner } from "@/shared/components/spinner/Spinner.js";
import { useToast } from "@/shared/components/toast/Toast.js";
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from "@/features/categories/models/category-colors.js";
import { createCategory } from "../services/category-api.js";
import { categoryMutationKeys, categoryQueryKeys } from "../services/category-queries.js";
import styles from "./CategoryDialog.module.css";

export function CategoryDialog({ categories, onClose, open }: { categories: Category[]; onClose: () => void; open: boolean }) {
	const [name, setName] = useState("");
	const [color, setColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
	const client = useQueryClient();
	const toast = useToast();
	const mutation = useMutation({
		mutationKey: categoryMutationKeys.create,
		mutationFn: createCategory,
		onSuccess: async () => {
			setName("");
			toast.show("分類已建立");
			await client.invalidateQueries({ queryKey: categoryQueryKeys.all });
		},
		onError: error => toast.show(error instanceof Error ? error.message : "無法建立分類", "error")
	});

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const parsed = createCategorySchema.safeParse({ name, color });
		if (parsed.success) mutation.mutate(parsed.data);
	};

	return (
		<AppDialog onOpenChange={next => (next ? undefined : onClose())} open={open} title="分類">
			<div className={styles.list}>
				{categories.map(category => (
					<div className={styles.row} key={category.id}>
						<i style={{ backgroundColor: category.color }} />
						<span>{category.name}</span>
						{category.isDefault ? <small>預設</small> : null}
					</div>
				))}
			</div>
			<form className={styles.form} onSubmit={submit}>
				<Field label="新增分類">
					<input disabled={mutation.isPending} maxLength={40} onChange={event => setName(event.target.value)} value={name} />
				</Field>
				<fieldset className={styles.colors}>
					<legend>顏色</legend>
					{CATEGORY_COLORS.map(option => (
						<label aria-label={option.label} key={option.value} style={{ backgroundColor: option.value }} title={option.label}>
							<input checked={color === option.value} name="category-color" onChange={() => setColor(option.value)} type="radio" value={option.value} />
							<span className="sr-only">{option.label}</span>
						</label>
					))}
				</fieldset>
				<Button disabled={!name.trim() || mutation.isPending} type="submit" variant="tonal">
					{mutation.isPending ? <Spinner label="建立分類中" size="small" /> : null}
					建立分類
				</Button>
			</form>
		</AppDialog>
	);
}
