import { Moon, Sun } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { getInitialTheme, onThemeChange, toggleTheme } from "../theme";

export interface ThemeToggleProps {
	className?: string;
}

/** Sun/Moon switch. Reflects the live theme without forcing its own layout. */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
	const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme());

	useEffect(() => onThemeChange(setTheme), []);

	const dark = theme === "dark";

	return (
		<button
			type="button"
			aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
			title={dark ? "Switch to light theme" : "Switch to dark theme"}
			onClick={() => toggleTheme()}
			className={cn(
				"group inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
		>
			{dark ? (
				<Sun className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />
			) : (
				<Moon className="h-4 w-4 transition-transform duration-200 group-hover:-rotate-12" />
			)}
		</button>
	);
};
