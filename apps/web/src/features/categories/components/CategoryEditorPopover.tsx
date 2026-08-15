import { updateCategorySchema, type Category, type UpdateCategoryInput } from "@em-todo/shared";
import { Popover } from "@base-ui/react/popover";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/shared/components/button/Button.js";
import { Icon } from "@/shared/components/icon/Icon.js";
import { CATEGORY_COLORS } from "@/features/categories/models/category-colors.js";
import styles from "./CategoryEditorPopover.module.css";

export function CategoryEditorPopover({ category, children, onUpdate }: { category: Category; children: ReactNode; onUpdate: (input: UpdateCategoryInput) => void }) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState(category.name);
	const [color, setColor] = useState(category.color);

	const changeOpen = (next: boolean) => {
		if (next) {
			setName(category.name);
			setColor(category.color);
		}
		setOpen(next);
	};

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const parsed = updateCategorySchema.safeParse({ name, color });
		if (!parsed.success) return;
		const input: UpdateCategoryInput = {};
		if (parsed.data.name !== category.name) input.name = parsed.data.name;
		if (parsed.data.color !== category.color) input.color = parsed.data.color;
		if (Object.keys(input).length > 0) onUpdate(input);
		setOpen(false);
	};

	return (
		<Popover.Root onOpenChange={changeOpen} open={open}>
			<Popover.Trigger aria-label={`編輯分類 ${category.name}`} className={styles.trigger}>
				{children}
			</Popover.Trigger>
			<Popover.Portal>
				<Popover.Positioner align="start" className={styles.positioner} side="right" sideOffset={8}>
					<Popover.Popup className={styles.popup}>
						<Popover.Arrow className={styles.arrow} />
						<header className={styles.header}>
							<div>
								<Popover.Title className={styles.title}>編輯分類</Popover.Title>
								{category.isDefault ? <Popover.Description className={styles.description}>這是預設分類</Popover.Description> : null}
							</div>
							<Popover.Close aria-label="關閉分類編輯" className={styles.close}>
								<Icon name="close" />
							</Popover.Close>
						</header>
						<form className={styles.form} onSubmit={submit}>
							<label className={styles.nameField}>
								<span>名稱</span>
								<input autoFocus maxLength={40} onChange={event => setName(event.target.value)} required value={name} />
							</label>
							<fieldset className={styles.colors}>
								<legend>顏色</legend>
								<div className={styles.palette}>
									{CATEGORY_COLORS.map(option => (
										<label aria-label={option.label} key={option.value} style={{ backgroundColor: option.value }} title={option.label}>
											<input checked={color.toUpperCase() === option.value} name={`category-color-${category.id}`} onChange={() => setColor(option.value)} type="radio" value={option.value} />
											{color.toUpperCase() === option.value ? <Icon name="check" /> : null}
										</label>
									))}
								</div>
							</fieldset>
							<div className={styles.actions}>
								<Popover.Close className={styles.cancel}>取消</Popover.Close>
								<Button disabled={!name.trim()} type="submit" variant="tonal">
									儲存
								</Button>
							</div>
						</form>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
}
