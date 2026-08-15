import styles from "./Spinner.module.css";

export function Spinner({ label = "載入中", size = "medium" }: { label?: string; size?: "small" | "medium" }) {
	return <span aria-label={label} className={[styles.spinner, size === "small" ? styles.small : ""].filter(Boolean).join(" ")} role="status" />;
}
