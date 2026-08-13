import { useMutation, useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { ApiRequestError, getSession, login } from "./api.js";
import { Spinner } from "./components/Spinner.js";
import { ToastProvider } from "./components/Toast.js";
import { queryClient, queryKeys } from "./queries.js";

const SprintApp = lazy(() => import("./SprintApp.js"));

export function App() {
	const session = useQuery({
		queryKey: queryKeys.session,
		queryFn: ({ signal }) => getSession(signal),
		staleTime: 30_000,
		retry: false
	});

	if (session.isPending) return <AppSplash label="正在恢復工作區" />;

	return (
		<ToastProvider>
			<Routes>
				<Route path="/login" element={session.data ? <Navigate replace to="/app" /> : <LoginPage />} />
				<Route
					path="/app/*"
					element={
						session.data ? (
							<Suspense fallback={<AppSplash label="正在準備 sprint" />}>
								<SprintApp />
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

function LoginPage() {
	const [password, setPassword] = useState("");
	const navigate = useNavigate();
	const location = useLocation();
	const mutation = useMutation({
		mutationFn: login,
		onSuccess: async () => {
			queryClient.setQueryData(queryKeys.session, true);
			await queryClient.invalidateQueries({ queryKey: queryKeys.categories });
			const target = (location.state as { from?: string } | null)?.from ?? "/app";
			navigate(target, { replace: true });
		}
	});

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (password) mutation.mutate(password);
	};

	useEffect(() => {
		document.documentElement.dataset.page = "login";
		return () => {
			delete document.documentElement.dataset.page;
		};
	}, []);

	return (
		<main className="login-page">
			<section aria-labelledby="login-title" className="login-card">
				<div className="brand-mark brand-mark--large" aria-hidden="true">
					<span />
				</div>
				<p className="eyebrow">SPRINTLY</p>
				<h1 id="login-title">回到你的這一週</h1>
				<p className="login-intro">一個密碼，沒有帳號雜訊。你的 sprint 與項目只留在這個工作區。</p>
				<form className="login-form" onSubmit={submit}>
					<label className="field">
						<span>工作區密碼</span>
						<input
							autoComplete="current-password"
							autoFocus
							disabled={mutation.isPending}
							onChange={event => setPassword(event.target.value)}
							placeholder="輸入密碼"
							type="password"
							value={password}
						/>
					</label>
					{mutation.isError ? (
						<p className="field-error" role="alert">
							{mutation.error instanceof ApiRequestError ? mutation.error.message : "暫時無法登入，請稍後再試"}
						</p>
					) : null}
					<button className="button button--filled button--large" disabled={!password || mutation.isPending}>
						{mutation.isPending ? <Spinner label="正在登入" size="small" /> : null}
						{mutation.isPending ? "驗證中" : "進入工作區"}
					</button>
				</form>
				<div className="login-security">
					<span aria-hidden="true">●</span>
					密碼只以雜湊形式保存在 SQLite
				</div>
			</section>
		</main>
	);
}

function AppSplash({ label }: { label: string }) {
	return (
		<main aria-busy="true" className="app-splash">
			<div className="brand-mark brand-mark--large" aria-hidden="true">
				<span />
			</div>
			<Spinner label={label} />
			<p>{label}</p>
		</main>
	);
}
