import { useCreateContact } from "@ataqu/api-client";
import {
	Bone,
	Button,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
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
				<Bone
					loading={submitting}
					name="create-contact"
					fallback={<div className="h-40 w-full rounded bg-white/5" />}
				>
					<div className="space-y-3">
						<div>
							<Label>
								<Trans>Name</Trans>
							</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Jane Doe"
							/>
						</div>
						<div>
							<Label>
								<Trans>Email</Trans>
							</Label>
							<Input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="jane@acme.com"
							/>
						</div>
						<div>
							<Label>
								<Trans>Phone</Trans>
							</Label>
							<Input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder="+1 555 000 0000"
							/>
						</div>
						<div>
							<Label>
								<Trans>Company</Trans>
							</Label>
							<Input
								value={company}
								onChange={(e) => setCompany(e.target.value)}
								placeholder="Acme"
							/>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								<Trans>Cancel</Trans>
							</Button>
							<Button onClick={handleSubmit} disabled={submitting}>
								<Trans>Create</Trans>
							</Button>
						</div>
					</div>
				</Bone>
			</DialogContent>
		</Dialog>
	);
}
