import type { Category } from "@em-todo/shared";

import { Icon } from "../../../../shared/components/icon/Icon.js";
import { CategoryTag } from "./CategoryTag.js";
import styles from "./TaskCardActions.module.css";

export function TaskCardActions({
	categories,
	category,
	disabled,
	onCategoryChange,
	onUrgencyChange,
	urgency
}: {
	categories: Category[];
	category: Category | undefined;
	disabled: boolean;
	onCategoryChange: (value: string) => void;
	onUrgencyChange: () => void;
	urgency: number;
}) {
	const nextUrgency = urgency === 4 ? 1 : urgency + 1;
	return (
		<div className={styles.actions}>
			<CategoryTag categories={categories} category={category} disabled={disabled} onChange={onCategoryChange} value={category?.id ?? ""} />
			<button
				aria-label={`緊急程度 ${urgency}，點擊調整為 ${nextUrgency}`}
				className={`${styles.urgencyButton} ${styles.urgencyFlag} ${urgencyClass(urgency)}`}
				disabled={disabled}
				onClick={event => {
					event.stopPropagation();
					onUrgencyChange();
				}}
				onPointerDown={event => event.stopPropagation()}
				title={`緊急程度 ${urgency}，點擊調整為 ${nextUrgency}`}
				type="button"
			>
				<Icon name="flag" />
			</button>
		</div>
	);
}

export function urgencyClass(urgency: number): string {
	if (urgency === 4) return styles.urgency4!;
	if (urgency === 3) return styles.urgency3!;
	if (urgency === 2) return styles.urgency2!;
	return styles.urgency1!;
}
