import type { CreateProductRequest, Product } from "@ataqu/api-client";
import { createProduct } from "@ataqu/api-client";
import { Button, Input, Label } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import type { QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";
import { showToast } from "./toast-store";

interface PaginatedProducts {
	items: Product[];
	total: number;
	limit: number;
	offset: number;
}

interface CreateProductContext {
	previousProducts?: ReadonlyArray<[QueryKey, PaginatedProducts | undefined]>;
}

export function CreateProductForm({ onCreated }: { onCreated?: () => void }) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [sku, setSku] = useState("");
	const [description, setDescription] = useState("");

	const mutation = useMutation<
		Product,
		Error,
		CreateProductRequest,
		CreateProductContext
	>({
		mutationFn: createProduct,
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: ["vault", "products"] });

			const previousProducts = queryClient.getQueriesData<PaginatedProducts>({
				queryKey: ["vault", "products"],
			});

			const optimisticProduct: Product = {
				id: crypto.randomUUID(),
				name: variables.name,
				description: variables.description,
				sku: variables.sku,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				version: 0,
			};

			queryClient.setQueriesData<PaginatedProducts>(
				{ queryKey: ["vault", "products"] },
				(old) => {
					if (!old) return old;
					return {
						...old,
						items: [optimisticProduct, ...old.items],
						total: old.total + 1,
					};
				},
			);

			return { previousProducts };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousProducts) {
				for (const [queryKey, data] of context.previousProducts) {
					queryClient.setQueryData(queryKey, data);
				}
			}

			showToast({
				variant: "error",
				title: <Trans>Product creation failed.</Trans>,
				description: (
					<Trans>
						A product with this SKU may already exist, or the server encountered
						an error.
					</Trans>
				),
			});
		},
		onSuccess: () => {
			showToast({
				variant: "success",
				title: <Trans>Product created.</Trans>,
			});
			setName("");
			setSku("");
			setDescription("");
			onCreated?.();
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: ["vault", "products"] });
		},
	});

	const canSubmit =
		name.trim().length > 0 && sku.trim().length > 0 && !mutation.isPending;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canSubmit) return;

		mutation.mutate({
			name: name.trim(),
			sku: sku.trim(),
			description: description.trim(),
		});
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4 rounded-lg border border-border bg-card p-4"
		>
			<div className="grid gap-4 md:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor="create-product-name">
						<Trans>Name</Trans>
					</Label>
					<Input
						id="create-product-name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder={"Acme widget"}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="create-product-sku">
						<Trans>SKU</Trans>
					</Label>
					<Input
						id="create-product-sku"
						value={sku}
						onChange={(event) => setSku(event.target.value)}
						placeholder={"ACM-001"}
						required
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="create-product-description">
						<Trans>Description</Trans>
					</Label>
					<Input
						id="create-product-description"
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						placeholder={"Short product description"}
					/>
				</div>
			</div>
			<Button type="submit" disabled={!canSubmit}>
				{mutation.isPending ? (
					<Trans>Creating...</Trans>
				) : (
					<Trans>Create Product</Trans>
				)}
			</Button>
		</form>
	);
}
