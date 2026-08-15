import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastApi = { show: (message: string, tone?: "default" | "error") => void };
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toast, setToast] = useState<{ id: number; message: string; tone: "default" | "error" } | null>(null);
	const show = useCallback((message: string, tone: "default" | "error" = "default") => {
		const next = { id: Date.now(), message, tone };
		setToast(next);
		window.setTimeout(() => setToast(current => (current?.id === next.id ? null : current)), 4500);
	}, []);
	const api = useMemo(() => ({ show }), [show]);

	return (
		<ToastContext.Provider value={api}>
			{children}
			<div aria-atomic="true" aria-live="polite" className="toast-region">
				{toast ? (
					<div className={`toast toast--${toast.tone}`} role="status">
						{toast.message}
					</div>
				) : null}
			</div>
		</ToastContext.Provider>
	);
}

export function useToast(): ToastApi {
	const value = useContext(ToastContext);
	if (!value) throw new Error("useToast must be used within ToastProvider");
	return value;
}
