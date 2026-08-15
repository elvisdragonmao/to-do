import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { LoginPage } from "../features/auth/components/LoginPage.js";
import { sessionQuery } from "../features/auth/services/auth-query.js";
import { Spinner } from "../shared/components/spinner/Spinner.js";
import { ToastProvider } from "../shared/components/toast/Toast.js";

const WorkspaceRoutes = lazy(() => import("../features/workspace/routes/WorkspaceRoutes.js"));

export function RootRouter() {
	const location = useLocation();
	const session = useQuery(sessionQuery());

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
