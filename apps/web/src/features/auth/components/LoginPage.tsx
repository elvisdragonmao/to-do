import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { categoryQueryKeys } from "@/features/categories/services/category-queries.js";
import { Button } from "@/shared/components/button/Button.js";
import { Field, FieldError } from "@/shared/components/field/Field.js";
import { Spinner } from "@/shared/components/spinner/Spinner.js";
import { ApiRequestError } from "@/shared/services/api-client.js";
import { queryClient } from "@/shared/services/query-client.js";
import { login } from "../services/auth-api.js";
import { sessionQueryKey } from "../services/auth-query.js";
import styles from "./LoginPage.module.css";

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
		<main className={styles.page}>
			<form aria-labelledby="login-title" className={styles.card} onSubmit={submit}>
				<h1 id="login-title">EM&apos;s To Do</h1>
				<Field label="密碼">
					<input autoComplete="current-password" autoFocus disabled={mutation.isPending} onChange={event => setPassword(event.target.value)} type="password" value={password} />
				</Field>
				{mutation.isError ? <FieldError>{mutation.error instanceof ApiRequestError ? mutation.error.message : "無法登入"}</FieldError> : null}
				<Button disabled={!password || mutation.isPending} large type="submit">
					{mutation.isPending ? <Spinner label="登入中" size="small" /> : null}
					登入
				</Button>
			</form>
		</main>
	);
}
