import type { ReactNode } from "react";

import styles from "./CountBadge.module.css";

export function CountBadge({ children }: { children: ReactNode }) {
	return <span className={styles.badge}>{children}</span>;
}
