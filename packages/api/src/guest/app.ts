import { Hono } from "hono";
import { Guest } from ".";
import { GuestAPI } from "./api";

const app = new Hono().post("/session", async (c) => {
	c.header("set-cookie", await GuestAPI.sessionCookie());
	return c.json({ workspaceId: Guest.WorkspaceId });
});

export default app;
