import { useCreateContact } from "@ataqu/api-client";
import {
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	FloatingLabelInput,
	InlineValidation,
	LoadingButton,
	SkeletonSwap,
	TagInput,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export function CreateContactDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [company, setCompany] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);

	const createMutation = useCreateContact({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["cinq", "contacts"] });
			toast.success("Contact created.");
			onOpenChange(false);
			setName("");
			setEmail("");
			setPhone("");
			setCompany("");
			setTags([]);
		},
		onError: () => toast.error("Create failed"),
	});

	const handleSubmit = () => {
		if (!name || !email) {
			toast.error("Name and email are required.");
			return;
		}
		setSubmitting(true);
		createMutation
			.mutateAsync({
				name,
				email,
				phone: phone || undefined,
				company: company || undefined,
			})
			.finally(() => setSubmitting(false));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						<Trans>New Contact</Trans>
					</DialogTitle>
				</DialogHeader>
				<SkeletonSwap ready={!submitting} lines={4}>
					<div className="space-y-3">
						<FloatingLabelInput label="Name" value={name} onChange={setName} />
						<InlineValidation
							label="Email"
							type="email"
							value={email}
							onChange={setEmail}
							validate={(v) =>
								/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length === 0
									? null
									: "Enter a valid email address"
							}
						/>
						<FloatingLabelInput
							label="Phone"
							type="tel"
							value={phone}
							onChange={setPhone}
						/>
						<FloatingLabelInput
							label="Company"
							value={company}
							onChange={setCompany}
						/>
						<div>
							<Label text="Tags" />
							<TagInput
								value={tags}
								onChange={setTags}
								placeholder="Add a tag and press Enter"
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								<Trans>Cancel</Trans>
							</Button>
							<LoadingButton
								onAction={async () => {
									await new Promise<void>((resolve, reject) => {
										try {
											handleSubmit();
											resolve();
										} catch (e) {
											reject(e);
										}
									});
								}}
								disabled={submitting}
								className="bg-amber text-black hover:bg-amber/90"
							>
								Create
							</LoadingButton>
						</div>
					</div>
				</SkeletonSwap>
			</DialogContent>
		</Dialog>
	);
}

function Label({ text }: { text: string }) {
	return <label className="block text-sm font-medium mb-1">{text}</label>;
}
