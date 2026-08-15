import type { ReactNode } from "react";

import styles from "./TargetKey.module.css";

export function TargetKey({ children }: { children: ReactNode }) {
	return <kbd className={styles.key}>{children}</kbd>;
}
