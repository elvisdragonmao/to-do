import type { Category } from "@em-todo/shared";
import type { CSSProperties } from "react";

import { Icon } from "../../../../shared/components/icon/Icon.js";
import styles from "./TaskCardActions.module.css";

export function CategoryTag({
	categories,
	category,
	disabled = false,
	onChange,
	value
}: {
	categories: Category[];
	category: Category | undefined;
	disabled?: boolean;
	onChange?: (value: string) => void;
	value: string;
}) {
	const content = (
		<>
			<i aria-hidden="true" className={styles.categoryDot} />
			<span>{category?.name ?? "未分類"}</span>
			{onChange ? <Icon name="chevronDown" /> : null}
		</>
	);
	const style = { "--task-category-color": category?.color ?? "var(--md-sys-color-outline)" } as CSSProperties;

	if (!onChange) {
		return (
			<span className={styles.categoryTag} style={style}>
				{content}
			</span>
		);
	}

	return (
		<label
			className={`${styles.categoryTag} ${styles.categoryTagInteractive}`}
			onClick={event => event.stopPropagation()}
			onPointerDown={event => event.stopPropagation()}
			style={style}
			title="編輯分類"
		>
			{content}
			<select aria-label="分類" disabled={disabled} onChange={event => onChange(event.target.value)} value={value}>
				{categories.map(option => (
					<option key={option.id} value={option.id}>
						{option.name}
					</option>
				))}
			</select>
		</label>
	);
}
