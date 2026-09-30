import { Core } from "../core";
import type { AppType } from "./routes";

function productionOrigin() {
	const domain = typeof process !== "undefined" ? process.env["DOMAIN"] : undefined;
	const raw = typeof domain === "string" ? domain.trim() : "";
	const host = (raw || "tomo.computer").replace(/^https?:\/\//, "").replace(/\/$/, "");
	return `https://${host}`;
}

export namespace Api {
	export type App = AppType;

	export const URLs = {
		Domains: {
			get Production() {
				return productionOrigin();
			},
			Development: `http://localhost:${Core.Ports.Web}`,
		},
	};
}
