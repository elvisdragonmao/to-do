import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { linkify } from "@/shared/utils/linkify.js";
import styles from "./TaskCardText.module.css";

export function TaskCardTextEditor({
	actions,
	description,
	disabled,
	onCommit,
	title
}: {
	actions: ReactNode;
	description: string;
	disabled: boolean;
	onCommit: (input: { title?: string; description?: string }) => void;
	title: string;
}) {
	const [editing, setEditing] = useState<"title" | "description" | null>(null);
	const [draftTitle, setDraftTitle] = useState(title);
	const [draftDescription, setDraftDescription] = useState(description);
	const titleRef = useRef<HTMLInputElement>(null);
	const descriptionRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (editing !== null) return;
		setDraftTitle(title);
		setDraftDescription(description);
	}, [description, editing, title]);
	useEffect(() => {
		if (editing === "title") titleRef.current?.focus();
		if (editing === "description") descriptionRef.current?.focus();
	}, [editing]);

	const begin = (field: "title" | "description") => {
		if (disabled) return;
		if (editing === null) {
			setDraftTitle(title);
			setDraftDescription(description);
		}
		setEditing(field);
	};
	const cancel = () => {
		setDraftTitle(title);
		setDraftDescription(description);
		setEditing(null);
	};
	const commit = () => {
		const nextTitle = draftTitle.trim();
		const nextDescription = draftDescription.trim();
		if (!nextTitle) {
			setDraftTitle(title);
			setEditing("title");
			return;
		}
		const input: { title?: string; description?: string } = {};
		if (nextTitle !== title) input.title = nextTitle;
		if (nextDescription !== description) input.description = nextDescription;
		setEditing(null);
		if (Object.keys(input).length > 0) onCommit(input);
	};
	const blur = () => {
		requestAnimationFrame(() => {
			if (document.activeElement !== titleRef.current && document.activeElement !== descriptionRef.current) commit();
		});
	};
	const keyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			cancel();
			return;
		}
		if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			commit();
			return;
		}
		if (event.key === "Enter" && editing === "title") {
			event.preventDefault();
			setEditing("description");
		}
	};

	return (
		<>
			<header className={styles.header}>
				{editing === "title" ? (
					<input
						aria-label="標題"
						className={`${styles.title} ${styles.inlineEditor}`}
						maxLength={160}
						onBlur={blur}
						onChange={event => setDraftTitle(event.target.value)}
						onKeyDown={keyDown}
						ref={titleRef}
						value={draftTitle}
					/>
				) : (
					<button className={`${styles.title} ${styles.inlineValue}`} disabled={disabled} onClick={() => begin("title")} title="編輯標題" type="button">
						{editing === "description" ? draftTitle : title}
					</button>
				)}
				{actions}
			</header>

			{editing === "description" ? (
				<textarea
					aria-label="描述"
					className={`${styles.description} ${styles.inlineEditor}`}
					maxLength={4000}
					onBlur={blur}
					onChange={event => setDraftDescription(event.target.value)}
					onKeyDown={keyDown}
					ref={descriptionRef}
					rows={2}
					value={draftDescription}
				/>
			) : description ? (
				<button className={`${styles.description} ${styles.inlineValue}`} disabled={disabled} onClick={() => begin("description")} title="編輯描述" type="button">
					{linkify(description)}
				</button>
			) : null}
		</>
	);
}
