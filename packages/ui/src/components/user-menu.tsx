import { useLogout } from "@ataqu/api-client";
import { useAuthStore } from "@ataqu/shared-stores";
import { Trans } from "@lingui/react/macro";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/**
 * Header user menu (brainstorm P2-7): replaces the bare logout row in the
 * sidebar with a proper avatar dropdown (identity + logout). Logout calls
 * the real endpoint, then clears the auth store and hard-navigates to
 * /login (same flow as the previous logout button — the hard redirect
 * guarantees every cached query from the old session is dropped).
 */
export function UserMenu() {
	const user = useAuthStore((s) => s.user);
	const storeLogout = useAuthStore((s) => s.logout);
	const logout = useLogout({
		onSuccess: () => {
			storeLogout();
			window.location.href = "/login";
		},
	});

	const initial = (user?.email ?? "?").trim().charAt(0).toUpperCase();
	const email = user?.email || "Signed in";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/5 text-xs font-medium text-white transition-colors hover:border-border"
					aria-label="Account menu"
				>
					{initial}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<p className="truncate text-sm text-white">{email}</p>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={() => {
						logout.mutate();
						storeLogout();
						window.location.href = "/login";
					}}
				>
					<Trans>Log out</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
