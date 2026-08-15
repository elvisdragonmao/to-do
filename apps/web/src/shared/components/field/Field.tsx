import type { LabelHTMLAttributes, ReactNode } from "react";

import styles from "./Field.module.css";

export function Field({ children, label, ...props }: LabelHTMLAttributes<HTMLLabelElement> & { children: ReactNode; label: ReactNode }) {
	return (
		<label className={styles.field} {...props}>
			<span>{label}</span>
			{children}
		</label>
	);
}

export function FieldError({ children }: { children: ReactNode }) {
	return (
		<p className={styles.error} role="alert">
			{children}
		</p>
	);
}
