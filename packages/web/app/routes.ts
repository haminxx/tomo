import { type RouteConfig, index, layout } from "@react-router/dev/routes";

export default [
	layout("routes/desktop/layout.tsx", [index("routes/desktop/page.tsx")]),
] satisfies RouteConfig;
