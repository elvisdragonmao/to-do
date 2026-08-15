export function Spinner({ label = "載入中", size = "medium" }: { label?: string; size?: "small" | "medium" }) {
	return <span aria-label={label} className={`spinner spinner--${size}`} role="status" />;
}
