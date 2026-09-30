import { makeSignature } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import type { Db } from "../api/db";
import { DbAPI } from "../api/db/api";
import { AuthAPI } from "../auth/api";
import { User } from "../auth/user";
import { SandboxAPI } from "../sandbox/api";
import { WorkspaceAPI } from "../workspace/api";
import { DesktopAPI } from "../workspace/desktop/api";
import { Member } from "../workspace/member";
import { WindowAPI } from "../workspace/window/api";
import { Guest } from ".";

function sameSite(value: string) {
	if (value.toLowerCase() === "strict") return "Strict";
	if (value.toLowerCase() === "none") return "None";
	return "Lax";
}

function ensureUser(db: Db.Type) {
	const existing = db.select().from(User.Table).where(eq(User.Table.id, Guest.UserId)).get();
	if (existing) return existing;
	const now = new Date();
	const user = db
		.insert(User.Table)
		.values({
			id: Guest.UserId,
			name: Guest.Name,
			email: Guest.Email,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		})
		.returning()
		.get();
	if (!user) throw new Error("Failed to seed guest user");
	return user;
}

export namespace GuestAPI {
	export function seed() {
		const db = DbAPI.instance();
		const user = ensureUser(db);
		const existing = WorkspaceAPI.get(db, { id: Guest.WorkspaceId });
		if (!existing) {
			WorkspaceAPI.create(db, {
				id: Guest.WorkspaceId,
				owner: user,
				input: { name: Guest.WorkspaceName },
			});
			return;
		}
		if (!WorkspaceAPI.member(db, { workspace: existing, user })) {
			db.insert(Member.Table)
				.values({ workspaceId: existing.id, userId: user.id, role: "owner" })
				.run();
		}
		if (DesktopAPI.list(db, existing).length === 0) {
			const desktop = DesktopAPI.initial(db, { workspace: existing, user });
			WindowAPI.welcome(db, {
				workspace: existing,
				desktop,
				user,
				path: SandboxAPI.Welcome,
			});
		}
		SandboxAPI.create(existing.id);
	}

	export async function sessionCookie() {
		const db = DbAPI.instance();
		const user = db.select().from(User.Table).where(eq(User.Table.id, Guest.UserId)).get();
		if (!user) throw new Error("Guest user is not seeded");
		const ctx = await AuthAPI.instance().$context;
		const session = await ctx.internalAdapter.createSession(user.id);
		if (!session?.token) throw new Error("Failed to create guest session");
		const signature = await makeSignature(session.token, ctx.secret);
		const cookie = ctx.authCookies.sessionToken;
		const maxAge = cookie.attributes.maxAge ?? ctx.sessionConfig.expiresIn;
		const parts = [
			`${cookie.name}=${session.token}.${signature}`,
			`Max-Age=${maxAge}`,
			`Path=${cookie.attributes.path}`,
			`SameSite=${sameSite(cookie.attributes.sameSite ?? "lax")}`,
		];
		if (cookie.attributes.httpOnly) parts.push("HttpOnly");
		if (cookie.attributes.secure) parts.push("Secure");
		return parts.join("; ");
	}
}
