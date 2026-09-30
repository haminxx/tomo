import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Api } from "../api";
import { Db } from "../api/db";
import { DbAPI } from "../api/db/api";
import { Env } from "../api/env";
import { Account } from "./account";
import { Session } from "./session";
import { User } from "./user";
import { Verification } from "./verification";

export namespace AuthAPI {
	export function create(db: Db.Type) {
		const production = Env.ENVIRONMENT === "production";
		const google =
			Env.GOOGLE_CLIENT_ID && Env.GOOGLE_CLIENT_SECRET
				? { google: { clientId: Env.GOOGLE_CLIENT_ID, clientSecret: Env.GOOGLE_CLIENT_SECRET } }
				: {};

		const origin = Api.URLs.Domains.Production;
		return betterAuth({
			database: drizzleAdapter(db, {
				provider: Db.Provider,
				schema: {
					user: User.Table,
					account: Account.Table,
					session: Session.Table,
					verification: Verification.Table,
				},
			}),
			secret: Env.BETTER_AUTH_SECRET,
			baseURL: production ? origin : Api.URLs.Domains.Development,
			basePath: "/api/auth",
			trustedOrigins: production
				? [origin, `https://*.${new URL(origin).host}`]
				: [Api.URLs.Domains.Development, origin],
			emailAndPassword: { enabled: true },
			socialProviders: { ...google },
			session: {
				cookieCache: {
					enabled: true,
					maxAge: 5 * 60,
				},
			},
		});
	}

	let cached: ReturnType<typeof create> | undefined;

	export function instance() {
		cached ??= create(DbAPI.instance());
		return cached;
	}
}
