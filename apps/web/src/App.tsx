import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { getSession } from "./api.js";
import { Spinner } from "./components/Spinner.js";
import { ToastProvider } from "./components/Toast.js";
import { LoginPage } from "./features/auth/LoginPage.js";
import { queryKeys } from "./queries.js";

const WorkspaceRoutes = lazy(() => import("./features/workspace/WorkspaceRoutes.js"));

export function App() {
	const location = useLocation();
	const session = useQuery({
		queryKey: queryKeys.session,
		queryFn: ({ signal }) => getSession(signal),
		staleTime: 30_000,
		retry: false
	});

	if (session.isPending) return <AppSplash />;

	return (
		<ToastProvider>
			<Routes>
				<Route path="/login" element={session.data ? <Navigate replace to="/app" /> : <LoginPage />} />
				<Route
					path="/app/*"
					element={
						session.data ? (
							<Suspense fallback={<AppSplash />}>
								<WorkspaceRoutes />
							</Suspense>
						) : (
							<Navigate replace state={{ from: location.pathname }} to="/login" />
						)
					}
				/>
				<Route path="*" element={<Navigate replace to={session.data ? "/app" : "/login"} />} />
			</Routes>
		</ToastProvider>
	);
}

function AppSplash() {
	return (
		<main aria-busy="true" aria-label="載入中" className="app-splash">
			<Spinner label="載入中" />
		</main>
	);
}
