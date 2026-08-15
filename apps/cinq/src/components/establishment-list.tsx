import {
	useCreateEstablishment,
	useListEstablishments,
} from "@ataqu/api-client";
import { Button, Card, EmptyState, Input, Label, Skeleton } from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";

export function EstablishmentList() {
	const queryClient = useQueryClient();
	const { data, isLoading, isError } = useListEstablishments();
	const [showCreate, setShowCreate] = useState(false);
	const [companyName, setCompanyName] = useState("");
	const [siret, setSiret] = useState("");
	const [address, setAddress] = useState("");

	const create = useCreateEstablishment({
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: ["cinq", "establishments"],
			});
			setCompanyName("");
			setSiret("");
			setAddress("");
			setShowCreate(false);
		},
	});

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (companyName.trim().length === 0 || create.isPending) return;
		create.mutate({
			company_name: companyName.trim(),
			siret: siret.trim() === "" ? undefined : siret.trim(),
			address: address.trim() === "" ? undefined : address.trim(),
		});
	};

	if (isLoading) return <Skeleton className="h-64 w-full" />;
	if (isError)
		return (
			<EmptyState
				title={<Trans>Unable to load establishments</Trans>}
				description={
					<Trans>Reload the page or try again in a few seconds.</Trans>
				}
			/>
		);

	const establishments = data ?? [];

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between gap-2">
				<h2 className="font-heading text-xl font-semibold text-foreground">
					<Trans>Establishments</Trans>
				</h2>
				<Button type="button" onClick={() => setShowCreate((v) => !v)}>
					{showCreate ? <Trans>Close</Trans> : <Trans>Add Establishment</Trans>}
				</Button>
			</div>

			{showCreate ? (
				<form
					onSubmit={handleSubmit}
					className="space-y-4 rounded-lg border border-border bg-card p-4"
				>
					<div className="space-y-2">
						<Label htmlFor="est-company">
							<Trans>Company name</Trans>
						</Label>
						<Input
							id="est-company"
							value={companyName}
							onChange={(e) => setCompanyName(e.target.value)}
							placeholder="Acme France"
							required
						/>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="est-siret">
								<Trans>SIRET</Trans>
							</Label>
							<Input
								id="est-siret"
								value={siret}
								onChange={(e) => setSiret(e.target.value)}
								placeholder="12345678901234"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="est-address">
								<Trans>Address</Trans>
							</Label>
							<Input
								id="est-address"
								value={address}
								onChange={(e) => setAddress(e.target.value)}
								placeholder="12 Rue de la Paix, Paris"
							/>
						</div>
					</div>
					<Button type="submit" disabled={create.isPending}>
						{create.isPending ? (
							<Trans>Creating...</Trans>
						) : (
							<Trans>Create Establishment</Trans>
						)}
					</Button>
				</form>
			) : null}

			{establishments.length === 0 ? (
				<EmptyState
					title={<Trans>No establishments yet</Trans>}
					description={
						<Trans>
							Add your first establishment to organize multi-site operations.
						</Trans>
					}
				/>
			) : (
				<div className="grid gap-3 md:grid-cols-2">
					{establishments.map((est) => (
						<Card key={est.id} className="p-4">
							<p className="font-medium text-foreground">{est.company_name}</p>
							{est.siret ? (
								<p className="text-xs text-muted-foreground">
									SIRET: {est.siret}
								</p>
							) : null}
							{est.address ? (
								<p className="text-xs text-muted-foreground">{est.address}</p>
							) : null}
						</Card>
					))}
				</div>
			)}
		</section>
	);
}
