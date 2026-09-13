// apps/aegis/src/routes/_auth/settings.tsx

import {
	useGetIpAllowlist,
	useGetTenantSettings,
	useMfaSetup,
	useMfaVerify,
	useUpdateIpAllowlist,
	useUpdateTenantSettings,
} from "@ataqu/api-client";
import {
	Bone,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/settings")({
	component: () => {
		const queryClient = useQueryClient();

		const [mfaSecret, setMfaSecret] = useState<string | null>(null);
		const [mfaQrUrl, setMfaQrUrl] = useState<string | null>(null);
		const [mfaVerificationCode, setMfaVerificationCode] = useState("");

		const { data: tenant, isLoading, error } = useGetTenantSettings();

		const updateTenantMutation = useUpdateTenantSettings({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: ["aegis", "tenant"] });
				toast.success("Settings updated.");
			},
			onError: (_err: any) => {
				toast.error("Update failed");
			},
		});

		const { data: ipAllowlist, isLoading: ipLoading } = useGetIpAllowlist();
		const [ipDraft, setIpDraft] = useState<string>("");
		const updateIpMutation = useUpdateIpAllowlist({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ["aegis", "tenant", "ip-allowlist"],
				});
				setIpDraft("");
				toast.success("IP allowlist updated.");
			},
			onError: () => {
				toast.error("Failed to update IP allowlist");
			},
		});

		const { register, handleSubmit } = useForm<{ name: string }>({
			values: tenant ? { name: tenant.name } : { name: "" },
		});

		const setupMfaMutation = useMfaSetup({
			onSuccess: (data) => {
				setMfaSecret(data.secret);
				setMfaQrUrl(data.qr_code_url);
				toast.success("MFA setup initiated. Scan the QR code.");
			},
			onError: (_err: any) => {
				toast.error("MFA setup failed");
			},
		});

		const verifyMfaMutation = useMfaVerify({
			onSuccess: () => {
				setMfaSecret(null);
				setMfaQrUrl(null);
				toast.success("MFA enabled.");
			},
			onError: (_err: any) => {
				toast.error("Verification failed");
			},
		});

		if (isLoading) {
			return (
				<div className="p-6 space-y-6">
					<Bone
						loading
						name="settings-1"
						fallback={<div className="h-8 w-48" />}
					>
						{null}
					</Bone>
					<Bone
						loading
						name="settings-2"
						fallback={<div className="h-40 w-full" />}
					>
						{null}
					</Bone>
				</div>
			);
		}

		if (error || !tenant) {
			return <div>Error loading settings.</div>;
		}

		return (
			<div className="p-6 max-w-2xl">
				<h1 className="text-2xl font-heading mb-6">
					<Trans>Settings</Trans>
				</h1>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>
							<Trans>Tenant Information</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={handleSubmit((data) =>
								updateTenantMutation.mutate(data),
							)}
							className="space-y-4"
						>
							<div>
								<Label htmlFor="name">
									<Trans>Tenant Name</Trans>
								</Label>
								<Input id="name" {...register("name")} />
							</div>
							<div>
								<Label>
									<Trans>Plan</Trans>
								</Label>
								<p className="text-lg font-medium">{tenant.plan}</p>
							</div>
							<Button type="submit" disabled={updateTenantMutation.isPending}>
								{updateTenantMutation.isPending ? (
									<Trans>Saving...</Trans>
								) : (
									<Trans>Save</Trans>
								)}
							</Button>
						</form>
					</CardContent>
				</Card>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>
							<Trans>Multi-Factor Authentication (MFA)</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{!mfaSecret ? (
							<div>
								<p className="text-sm text-muted-foreground mb-4">
									<Trans>
										Secure your account with TOTP MFA. You'll need an
										authenticator app like Google Authenticator or Authy.
									</Trans>
								</p>
								<Button
									onClick={() => setupMfaMutation.mutate()}
									disabled={setupMfaMutation.isPending}
								>
									{setupMfaMutation.isPending ? (
										<Trans>Setting up...</Trans>
									) : (
										<Trans>Setup MFA</Trans>
									)}
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								<div className="flex justify-center">
									{mfaQrUrl && <QRCodeSVG value={mfaQrUrl} size={200} />}
								</div>
								<p className="text-sm text-muted-foreground">
									<Trans>
										Scan this QR code with your authenticator app, then enter
										the 6-digit code below to verify.
									</Trans>
								</p>
								<div className="flex gap-2">
									<Input
										type="text"
										placeholder="123456"
										value={mfaVerificationCode}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
											setMfaVerificationCode(e.target.value)
										}
										className="w-32"
									/>
									<Button
										onClick={() =>
											verifyMfaMutation.mutate({ code: mfaVerificationCode })
										}
										disabled={
											verifyMfaMutation.isPending ||
											mfaVerificationCode.length !== 6
										}
									>
										{verifyMfaMutation.isPending ? (
											<Trans>Verifying...</Trans>
										) : (
											<Trans>Verify</Trans>
										)}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>
							<Trans>IP Allowlist</Trans>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							<Trans>
								Restrict access to your tenant to specific IP addresses or CIDR
								ranges. Leave empty to allow all. Changes take effect
								immediately.
							</Trans>
						</p>
						{ipLoading ? (
							<Bone
								loading
								name="settings-3"
								fallback={<div className="mt-2 h-16 w-full" />}
							>
								{null}
							</Bone>
						) : (
							<ul className="mt-3 space-y-1">
								{(ipAllowlist?.ip_allowlist ?? []).map((entry) => (
									<li
										key={entry}
										className="flex items-center justify-between rounded border px-2 py-1 text-sm"
									>
										<code>{entry}</code>
										<Button
											variant="ghost"
											size="sm"
											onClick={() =>
												updateIpMutation.mutate(
													(ipAllowlist?.ip_allowlist ?? []).filter(
														(e) => e !== entry,
													),
												)
											}
										>
											<Trans>Remove</Trans>
										</Button>
									</li>
								))}
								{(ipAllowlist?.ip_allowlist ?? []).length === 0 && (
									<li className="text-sm text-muted-foreground">
										<Trans>No restrictions — all IPs allowed.</Trans>
									</li>
								)}
							</ul>
						)}
						<form
							className="mt-3 flex gap-2"
							onSubmit={(e) => {
								e.preventDefault();
								const value = ipDraft.trim();
								if (!value) return;
								updateIpMutation.mutate([
									...(ipAllowlist?.ip_allowlist ?? []),
									value,
								]);
							}}
						>
							<Input
								placeholder="203.0.113.5 or 203.0.113.0/24"
								value={ipDraft}
								onChange={(e) => setIpDraft(e.target.value)}
							/>
							<Button
								type="submit"
								disabled={updateIpMutation.isPending || !ipDraft.trim()}
							>
								<Trans>Add</Trans>
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		);
	},
});
