import { startOfSprint } from "@em-todo/shared";
import { Navigate, Route, Routes } from "react-router-dom";

import { WorkspacePage } from "../pages/WorkspacePage.js";

export default function WorkspaceRoutes() {
	return (
		<Routes>
			<Route index element={<Navigate replace to={`sprint/${startOfSprint(new Date())}`} />} />
			<Route path="sprint/:sprintStart" element={<WorkspacePage />} />
			<Route path="*" element={<Navigate replace to={`sprint/${startOfSprint(new Date())}`} />} />
		</Routes>
	);
}
