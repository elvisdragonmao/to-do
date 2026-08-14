import { startOfSprint } from "@sprintly/shared";
import { Navigate, Route, Routes } from "react-router-dom";

import { Workspace } from "./Workspace.js";

export default function WorkspaceRoutes() {
	return (
		<Routes>
			<Route index element={<Navigate replace to={`sprint/${startOfSprint(new Date())}`} />} />
			<Route path="sprint/:sprintStart" element={<Workspace />} />
			<Route path="*" element={<Navigate replace to={`sprint/${startOfSprint(new Date())}`} />} />
		</Routes>
	);
}
