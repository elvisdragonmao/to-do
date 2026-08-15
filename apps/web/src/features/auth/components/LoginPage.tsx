import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { categoryQueryKeys } from "../../categories/services/category-queries.js";
import { Spinner } from "../../../shared/components/spinner/Spinner.js";
import { ApiRequestError } from "../../../shared/services/api-client.js";
import { queryClient } from "../../../shared/services/query-client.js";
import { login } from "../services/auth-api.js";
import { sessionQueryKey } from "../services/auth-query.js";

export function LoginPage() {
	const [password, setPassword] = useState("");
	const navigate = useNavigate();
	const location = useLocation();
	const mutation = useMutation({
		mutationFn: login,
		onSuccess: async () => {
			queryClient.setQueryData(sessionQueryKey, true);
			await queryClient.invalidateQueries({ queryKey: categoryQueryKeys.all });
			const target = (location.state as { from?: string } | null)?.from ?? "/app";
			navigate(target, { replace: true });
		}
	});

	useEffect(() => {
		document.documentElement.dataset.page = "login";
		return () => {
			delete document.documentElement.dataset.page;
		};
	}, []);

	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (password) mutation.mutate(password);
	};

	return (
		<main className="login-page">
			<form aria-labelledby="login-title" className="login-card" onSubmit={submit}>
				<h1 id="login-title">EM&apos;s To Do</h1>
				<label className="field">
					<span>密碼</span>
					<input autoComplete="current-password" autoFocus disabled={mutation.isPending} onChange={event => setPassword(event.target.value)} type="password" value={password} />
				</label>
				{mutation.isError ? (
					<p className="field-error" role="alert">
						{mutation.error instanceof ApiRequestError ? mutation.error.message : "無法登入"}
					</p>
				) : null}
				<button className="button button--filled button--large" disabled={!password || mutation.isPending}>
					{mutation.isPending ? <Spinner label="登入中" size="small" /> : null}
					登入
				</button>
			</form>
		</main>
	);
}
