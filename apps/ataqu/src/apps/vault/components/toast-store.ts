import type { ReactNode } from "react";
import { create } from "zustand";

export interface VaultToastItem {
	id: string;
	variant: "success" | "error" | "info";
	title: ReactNode;
	description?: ReactNode;
}

interface VaultToastState {
	toasts: VaultToastItem[];
	push: (toast: Omit<VaultToastItem, "id">) => void;
	dismiss: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<VaultToastState>((set) => ({
	toasts: [],
	push: (toast) =>
		set((state) => ({
			toasts: [
				...state.toasts,
				(() => {
					toastCounter += 1;
					return {
						...toast,
						id: `vault-toast-${toastCounter}`,
					};
				})(),
			],
		})),
	dismiss: (id) =>
		set((state) => ({
			toasts: state.toasts.filter((toast) => toast.id !== id),
		})),
}));

export const showToast = (toast: Omit<VaultToastItem, "id">): void => {
	useToastStore.getState().push(toast);
};
