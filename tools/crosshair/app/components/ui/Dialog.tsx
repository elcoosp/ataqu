"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div
				className="fixed inset-0 bg-black/50 backdrop-blur-sm"
				onClick={() => onOpenChange(false)}
			/>
			<div className="relative z-50 w-full max-w-4xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 m-4">
				{children}
			</div>
		</div>
	);
}

interface DialogHeaderProps {
	children: React.ReactNode;
	className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
	return <div className={cn("mb-4", className)}>{children}</div>;
}

interface DialogTitleProps {
	children: React.ReactNode;
	className?: string;
}

export function DialogTitle({ children, className }: DialogTitleProps) {
	return <h2 className={cn("text-2xl font-bold", className)}>{children}</h2>;
}

interface DialogContentProps {
	children: React.ReactNode;
	className?: string;
}

export function DialogContent({ children, className }: DialogContentProps) {
	return <div className={cn("space-y-4", className)}>{children}</div>;
}

interface DialogFooterProps {
	children: React.ReactNode;
	className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
	return (
		<div className={cn("flex justify-end gap-2 mt-6 pt-4 border-t", className)}>
			{children}
		</div>
	);
}
