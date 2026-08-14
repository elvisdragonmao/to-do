import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { parseCompactDate } from "../../date-format.js";

export type QuickCreateValues = {
	title: string;
	estimatedHours: number | null;
	dueDate: string | null;
};

export function QuickCreate({ label, onCancel, onCreate }: { label: string; onCancel: () => void; onCreate: (values: QuickCreateValues) => void }) {
	const [title, setTitle] = useState("");
	const [hours, setHours] = useState("");
	const [deadline, setDeadline] = useState("");
	const [error, setError] = useState<string | null>(null);
	const titleRef = useRef<HTMLInputElement>(null);

	useEffect(() => titleRef.current?.focus(), []);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		const cleanTitle = title.trim();
		if (!cleanTitle) return setError("請輸入標題");
		const dueDate = deadline ? parseCompactDate(deadline) : null;
		if (deadline && !dueDate) return setError("Deadline 請輸入 YYYYMMDD");
		const estimatedHours = hours === "" ? null : Number(hours);
		if (estimatedHours !== null && (!Number.isFinite(estimatedHours) || estimatedHours < 0)) return setError("時間格式無效");
		onCreate({ title: cleanTitle, estimatedHours, dueDate });
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
		if (event.key === "Escape") {
			event.preventDefault();
			onCancel();
		}
	};

	return (
		<form aria-label={`新增到 ${label}`} className="quick-create" onKeyDown={handleKeyDown} onSubmit={submit}>
			<div className="quick-create__target">{label}</div>
			<label>
				<span className="sr-only">標題</span>
				<input maxLength={160} onChange={event => setTitle(event.target.value)} placeholder="標題" ref={titleRef} value={title} />
			</label>
			<div className="quick-create__details">
				<label>
					<span className="sr-only">預計時間（小時）</span>
					<input inputMode="decimal" min="0" onChange={event => setHours(event.target.value)} placeholder="小時" step="0.25" type="number" value={hours} />
				</label>
				<label>
					<span className="sr-only">Deadline</span>
					<input inputMode="numeric" maxLength={8} onChange={event => setDeadline(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="YYYYMMDD" value={deadline} />
				</label>
			</div>
			{error ? (
				<p className="quick-create__error" role="alert">
					{error}
				</p>
			) : null}
			<button className="sr-only" type="submit">
				建立
			</button>
		</form>
	);
}
