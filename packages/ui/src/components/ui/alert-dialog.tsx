"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { buttonVariants } from "./button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog";

/**
 * AlertDialog (brainstorm P3-3) — a modal that demands a decision.
 *
 * Built on the existing Radix Dialog primitive with `role="alertdialog"` so we
 * inherit focus trapping, Escape, click-outside, and `aria-modal` without
 * adding `@radix-ui/react-alert-dialog` to the dependency graph. The role
 * change is what makes screen readers announce it as an interruption rather
 * than a passive dialog.
 *
 * Escape/overlay-click are suppressed while `loading` so a destructive
 * confirm in flight cannot be dismissed into an ambiguous state.
 */

const AlertDialog = Dialog;
const AlertDialogTrigger = DialogTrigger;

const AlertDialogContent = React.forwardRef<
	React.ElementRef<typeof DialogContent>,
	React.ComponentPropsWithoutRef<typeof DialogContent> & {
		/** Block Escape / outside-click dismissal (a request is in flight). */
		loading?: boolean;
	}
>(
	(
		{ className, loading, onEscapeKeyDown, onInteractOutside, ...props },
		ref,
	) => (
		<DialogContent
			ref={ref}
			role="alertdialog"
			aria-busy={loading || undefined}
			onEscapeKeyDown={(event) => {
				if (loading) event.preventDefault();
				onEscapeKeyDown?.(event);
			}}
			onInteractOutside={(event) => {
				if (loading) event.preventDefault();
				onInteractOutside?.(event);
			}}
			className={cn("max-w-md", className)}
			{...props}
		/>
	),
);
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex flex-col gap-1.5", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
			className,
		)}
		{...props}
	/>
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogTitle>,
	React.ComponentPropsWithoutRef<typeof DialogTitle>
>(({ className, ...props }, ref) => (
	<DialogTitle ref={ref} className={cn("text-base", className)} {...props} />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogDescription>,
	React.ComponentPropsWithoutRef<typeof DialogDescription>
>(({ className, ...props }, ref) => (
	<DialogDescription ref={ref} className={className} {...props} />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogCancel = React.forwardRef<
	React.ElementRef<typeof DialogClose>,
	React.ComponentPropsWithoutRef<typeof DialogClose>
>(({ className, ...props }, ref) => (
	<DialogClose
		ref={ref}
		className={cn(buttonVariants({ variant: "outline" }), className)}
		{...props}
	/>
));
AlertDialogCancel.displayName = "AlertDialogCancel";

const AlertDialogAction = React.forwardRef<
	React.ElementRef<typeof DialogClose>,
	React.ComponentPropsWithoutRef<typeof DialogClose> & {
		variant?: "default" | "destructive";
	}
>(({ className, variant = "default", ...props }, ref) => (
	<DialogClose
		ref={ref}
		className={cn(buttonVariants({ variant }), className)}
		{...props}
	/>
));
AlertDialogAction.displayName = "AlertDialogAction";

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
};
