import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, test } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "tomo-guest-"));
process.env.ENVIRONMENT = "development";
process.env.DATABASE_PATH = join(dir, "tomo.db");
process.env.BETTER_AUTH_SECRET = "test-secret-test-secret-test-secret";

const { DbAPI } = await import("../src/api/db/api");
const { AuthAPI } = await import("../src/auth/api");
const { Guest } = await import("../src/guest");
const { GuestAPI } = await import("../src/guest/api");
const { WorkspaceAPI } = await import("../src/workspace/api");
const { DesktopAPI } = await import("../src/workspace/desktop/api");
const { SandboxAPI } = await import("../src/sandbox/api");

afterAll(async () => {
	await SandboxAPI.remove(Guest.WorkspaceId).catch(() => undefined);
	rmSync(dir, { recursive: true, force: true });
});

test("boot seeds one guest member and a session cookie for that user", async () => {
	const db = DbAPI.instance();
	DbAPI.migrate(db);
	GuestAPI.seed();
	GuestAPI.seed();

	const member = WorkspaceAPI.member(db, {
		workspace: { id: Guest.WorkspaceId },
		user: { id: Guest.UserId },
	});
	expect(member?.role).toBe("owner");
	expect(DesktopAPI.list(db, { id: Guest.WorkspaceId })).toHaveLength(1);

	const setCookie = await GuestAPI.sessionCookie();
	const pair = setCookie.split(";")[0];
	expect(pair?.includes("=")).toBe(true);
	const session = await AuthAPI.instance().api.getSession({
		headers: new Headers({ cookie: pair ?? "" }),
	});
	expect(session?.user.id).toBe(Guest.UserId);
	expect(session?.user.email).toBe(Guest.Email);
});
