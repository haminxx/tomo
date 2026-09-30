import { Guest } from "@tomo/api";
import { useEffect, useRef } from "react";
import { Outlet } from "react-router";
import { Skeleton } from "~/components/ui/skeleton";
import { useDesktopSync } from "~/hooks/use-desktops";
import { useFileSync } from "~/hooks/use-files";
import { useSyncConnection } from "~/hooks/use-sync";
import { useWindowSync } from "~/hooks/use-windows";
import { useWorkspaceSync } from "~/hooks/use-workspace";
import { useSession } from "~/lib/auth";
import { hono } from "~/lib/hono";

function Shell() {
	return (
		<main className="flex h-svh flex-col gap-2 bg-background p-2 sm:p-3">
			<Skeleton className="h-9 w-48 rounded-xl" />
			<Skeleton className="grow rounded-2xl" />
		</main>
	);
}

export default function DesktopLayout() {
	const { data: session, isPending, refetch } = useSession();
	const started = useRef(false);
	const ready = session?.user.id === Guest.UserId;

	useEffect(() => {
		if (isPending || ready || started.current) return;
		started.current = true;
		void hono.api.guest.session
			.$post()
			.then(async (response) => {
				if (!response.ok) throw new Error("Guest session failed");
				await refetch();
			})
			.catch((error: unknown) => {
				console.error(error);
			});
	}, [isPending, ready, refetch]);

	useSyncConnection(ready);
	useWorkspaceSync();
	useDesktopSync();
	useWindowSync();
	useFileSync();

	if (!ready) return <Shell />;
	return <Outlet />;
}
