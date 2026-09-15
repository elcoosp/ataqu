import type { EventType } from "@ataqu/api-client";
import { useCreateEventType, useUpdateEventType } from "@ataqu/api-client";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ataqu/ui";
import { Trans } from "@lingui/react/macro";
import type React from "react";
import { useState } from "react";
import { Textarea } from "../../../apps/tempo/components/ui/textarea";
import { toast } from "../../../apps/tempo/hooks/use-toast";

interface EventTypeFormProps {
	eventType?: EventType;
	onSuccess?: () => void;
}

export function EventTypeForm({ eventType, onSuccess }: EventTypeFormProps) {
	const createMutation = useCreateEventType();
	const updateMutation = useUpdateEventType();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [name, setName] = useState(eventType?.name ?? "");
	const [durationMinutes, setDurationMinutes] = useState(
		eventType?.duration_minutes ?? 30,
	);
	const [description, setDescription] = useState(eventType?.description ?? "");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		setIsSubmitting(true);
		try {
			const slug = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");

			const payload = {
				name: name.trim(),
				slug,
				description: description || undefined,
				duration_minutes: durationMinutes,
			};

			if (eventType) {
				await updateMutation.mutateAsync({
					id: eventType.id,
					data: payload,
					version: eventType.version,
				});
				toast.success("Event type updated.");
			} else {
				await createMutation.mutateAsync(payload);
				toast.success("Event type created.");
			}
			onSuccess?.();
		} catch {
			toast.error("Failed to save event type.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Basic Information</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<Label htmlFor="et-name">
							<Trans>Name</Trans>
						</Label>
						<Input
							id="et-name"
							value={name}
							onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
								setName(e.target.value)
							}
							required
						/>
					</div>
					<div>
						<Label htmlFor="et-duration">
							<Trans>Duration</Trans>
						</Label>
						<Select
							value={String(durationMinutes)}
							onValueChange={(v: string) => setDurationMinutes(Number(v))}
						>
							<SelectTrigger id="et-duration">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="15">
									<Trans>15 minutes</Trans>
								</SelectItem>
								<SelectItem value="30">
									<Trans>30 minutes</Trans>
								</SelectItem>
								<SelectItem value="60">
									<Trans>60 minutes</Trans>
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label htmlFor="et-desc">
							<Trans>Description</Trans>
						</Label>
						<Textarea
							id="et-desc"
							value={description}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
								setDescription(e.target.value)
							}
						/>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>
						<Trans>Coming Soon</Trans>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						<Trans>Advanced scheduling options like location, buffers, and reminders are supported by the backend and will be configurable here in a future update.</Trans>
					</p>
				</CardContent>
			</Card>

			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? (
					<Trans>Saving...</Trans>
				) : (
					<Trans>Save Event Type</Trans>
				)}
			</Button>
		</form>
	);
}
