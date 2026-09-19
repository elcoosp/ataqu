import { cn } from "@ataqu/ui";
import * as React from "react";

export interface SwitchProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
	({ className, checked = false, onCheckedChange, ...props }, ref) => {
		return (
			<input
				type="checkbox"
				role="switch"
				aria-checked={checked}
				className={cn(
					"h-6 w-11 appearance-none rounded-full transition-colors cursor-pointer",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
					"disabled:cursor-not-allowed disabled:opacity-50",
					checked ? "bg-primary" : "bg-secondary",
					className,
				)}
				ref={ref}
				checked={checked}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					onCheckedChange?.(e.target.checked)
				}
				{...props}
			/>
		);
	},
);
Switch.displayName = "Switch";

export { Switch };
