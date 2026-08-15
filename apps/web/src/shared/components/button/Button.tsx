import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.css";

type ButtonVariant = "filled" | "tonal" | "text" | "danger" | "textDanger";

export function Button({
	children,
	className,
	large = false,
	variant = "filled",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; large?: boolean; variant?: ButtonVariant }) {
	return (
		<button className={[styles.button, styles[variant], large ? styles.large : "", className].filter(Boolean).join(" ")} {...props}>
			{children}
		</button>
	);
}
