import { Hono } from "hono";
import userApp from "../auth/user/app";
import guestApp from "../guest/app";
import syncApp from "../sync/app";
import workspaceApp from "../workspace/app";
import inviteApp from "../workspace/invite/app";
import statusApp from "./status/app";

const app = new Hono()
	.basePath("/api")
	.route("/status", statusApp)
	.route("/guest", guestApp)
	.route("/sync", syncApp)
	.route("/user", userApp)
	.route("/workspace", workspaceApp)
	.route("/invites", inviteApp);

export type AppType = typeof app;
export default app;
