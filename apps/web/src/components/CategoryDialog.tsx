import { type Category, createCategorySchema } from "@sprintly/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { createCategory } from "../api.js";
import { mutationKeys, queryKeys } from "../queries.js";
import { AppDialog } from "./AppDialog.js";
import { Spinner } from "./Spinner.js";
import { useToast } from "./Toast.js";

const COLORS = ["#755b00", "#386a20", "#00658b", "#735471", "#904a43", "#5f5e62"];

export function CategoryDialog({ categories, onClose, open }: { categories: Category[]; onClose: () => void; open: boolean }) {
	const [name, setName] = useState("");
	const [color, setColor] = useState(COLORS[0]!);
	const client = useQueryClient();
	const toast = useToast();
	const mutation = useMutation({
		mutationKey: mutationKeys.createCategory,
		mutationFn: createCategory,
		onSuccess: async () => {
			setName("");
			toast.show("分類已建立");
			await client.invalidateQueries({ queryKey: queryKeys.categories });
		},
		onError: error => toast.show(error instanceof Error ? error.message : "無法建立分類", "error")
	});

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const parsed = createCategorySchema.safeParse({ name, color });
		if (parsed.success) mutation.mutate(parsed.data);
	};

	return (
		<AppDialog description="每個項目都必須屬於一個分類；未選擇時會放進「未分類」。" onOpenChange={next => (next ? undefined : onClose())} open={open} title="分類">
			<div className="category-list">
				{categories.map(category => (
					<div className="category-row" key={category.id}>
						<i style={{ backgroundColor: category.color }} />
						<span>{category.name}</span>
						{category.isDefault ? <small>預設</small> : null}
					</div>
				))}
			</div>
			<form className="category-form" onSubmit={submit}>
				<label className="field">
					<span>新增分類</span>
					<input disabled={mutation.isPending} maxLength={40} onChange={event => setName(event.target.value)} placeholder="例如：產品、學校、生活" value={name} />
				</label>
				<fieldset className="color-field">
					<legend>顏色</legend>
					{COLORS.map(option => (
						<label key={option} style={{ backgroundColor: option }}>
							<input checked={color === option} name="category-color" onChange={() => setColor(option)} type="radio" value={option} />
							<span className="sr-only">{option}</span>
						</label>
					))}
				</fieldset>
				<button className="button button--filled-tonal" disabled={!name.trim() || mutation.isPending}>
					{mutation.isPending ? <Spinner label="建立分類中" size="small" /> : null}
					建立分類
				</button>
			</form>
		</AppDialog>
	);
}
